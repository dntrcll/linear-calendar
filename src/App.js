import { useEffect, useState, useRef, useCallback } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const PIXELS_PER_MINUTE = 2.5;
const EVENT_HEIGHT = 52;
const ROW_GAP = 8;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

const COLORS = {
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 400: "#34d399", 500: "#10b981", 600: "#059669", 900: "#064e3b" },
  stone: { 50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c", 800: "#292524", 900: "#1c1917" },
  amber: { 500: "#f59e0b" },
  bgLight: "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 50%, #ecfdf5 100%)",
  bgDark: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #064e3b 100%)",
};

const EVENT_COLORS = {
  emerald: { bg: "linear-gradient(135deg, #10b981, #059669)", border: "#10b981", dot: "#10b981", light: "#ecfdf5" },
  sage: { bg: "linear-gradient(135deg, #84cc16, #65a30d)", border: "#84cc16", dot: "#84cc16", light: "#f7fee7" },
  amber: { bg: "linear-gradient(135deg, #f59e0b, #d97706)", border: "#f59e0b", dot: "#f59e0b", light: "#fffbeb" },
  terracotta: { bg: "linear-gradient(135deg, #ea580c, #c2410c)", border: "#ea580c", dot: "#ea580c", light: "#fff7ed" },
  slate: { bg: "linear-gradient(135deg, #475569, #334155)", border: "#475569", dot: "#475569", light: "#f8fafc" },
};

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "emerald" },
  { id: "personal", name: "Personal", color: "sage" },
  { id: "meeting", name: "Meeting", color: "amber" },
  { id: "event", name: "Event", color: "terracotta" },
  { id: "code", name: "Code", color: "slate" },
];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', -apple-system, sans-serif; }
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .current-day-pulse { animation: pulse 2s ease-in-out infinite; }
  .fade-in { animation: fadeIn 0.3s ease-out forwards; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 4px; }
`;

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  const QUOTES = ["Every day is a fresh start.", "Small progress is still progress.", "Focus on what you can control.", "Make today count.", "Progress over perfection.", "You've got this.", "Trust the process."];

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
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("work");
  const [filterCategory, setFilterCategory] = useState("All");
  const [viewMode, setViewMode] = useState("day");
  const [categories, setCategories] = useState(() => { const s = localStorage.getItem('categories'); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; });
  const [darkMode, setDarkMode] = useState(() => { const s = localStorage.getItem('darkMode'); return s ? JSON.parse(s) : false; });
  const [use24HourFormat, setUse24HourFormat] = useState(() => { const s = localStorage.getItem('use24HourFormat'); return s ? JSON.parse(s) : false; });
  const [dailyQuote] = useState(() => QUOTES[Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) % QUOTES.length]);
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const dragDataRef = useRef({ startX: 0, originalStart: null, originalEnd: null, handle: null });
  const [hasDragged, setHasDragged] = useState(false);
  const timelineRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => { const s = document.createElement('style'); s.textContent = globalStyles; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence).catch(console.error); return auth.onAuthStateChanged(setUser); }, []);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { localStorage.setItem('categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('use24HourFormat', JSON.stringify(use24HourFormat)); }, [use24HourFormat]);

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

  const saveEvent = async () => {
    if (!title.trim() || !startTime || !endTime || !user) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(currentDate); start.setHours(sh, sm, 0, 0);
    const end = new Date(currentDate); end.setHours(eh, em, 0, 0);
    if (end <= start) { alert("End time must be after start time"); return; }
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

  const resetForm = () => { setTitle(""); setStartTime(""); setEndTime(""); setEventCategory("work"); setEditingEvent(null); };
  const openNewEvent = (ps, pe) => { resetForm(); if (ps && pe) { setStartTime(fmtIn(ps)); setEndTime(fmtIn(pe)); } setShowModal(true); };
  const openEditEvent = (ev) => { setEditingEvent(ev); setTitle(ev.title); setStartTime(fmtIn(ev.start)); setEndTime(fmtIn(ev.end)); setEventCategory(ev.category || "work"); setShowModal(true); };

  const fmtIn = (d) => `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
  const fmtTime = (d) => use24HourFormat ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const goToToday = () => setCurrentDate(new Date());
  const navDate = (dir) => { const d = new Date(currentDate); if (viewMode === "day") d.setDate(d.getDate() + dir); else if (viewMode === "week") d.setDate(d.getDate() + dir * 7); else d.setFullYear(d.getFullYear() + dir); setCurrentDate(d); };
  const goToDate = (d) => { setCurrentDate(d); setViewMode("day"); };

  const filteredEvents = events.filter(ev => filterCategory === "All" || ev.category === filterCategory);
  const getEvtStyle = (ev, row) => { const sm = ev.start.getHours() * 60 + ev.start.getMinutes(); const em = ev.end.getHours() * 60 + ev.end.getMinutes(); return { left: sm * PIXELS_PER_MINUTE, width: Math.max((em - sm) * PIXELS_PER_MINUTE, MIN_EVENT_DURATION * PIXELS_PER_MINUTE), top: row * (EVENT_HEIGHT + ROW_GAP) }; };

  const assignRows = (evts) => {
    const sorted = [...evts].sort((a, b) => a.start - b.start);
    const rows = [];
    return sorted.map(ev => {
      const es = ev.start.getHours() * 60 + ev.start.getMinutes();
      const ee = ev.end.getHours() * 60 + ev.end.getMinutes();
      let row = 0;
      while (rows[row]?.some(x => { const xs = x.start.getHours() * 60 + x.start.getMinutes(); const xe = x.end.getHours() * 60 + x.end.getMinutes(); return es < xe && ee > xs; })) row++;
      if (!rows[row]) rows[row] = [];
      rows[row].push(ev);
      return { ...ev, row };
    });
  };

  const getDayEvts = () => filteredEvents.filter(ev => ev.start.toDateString() === currentDate.toDateString());
  const getWeekDays = () => { const s = new Date(currentDate); s.setDate(s.getDate() - s.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return d; }); };
  const weekDays = getWeekDays();

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
    if (Math.abs(dx) > 5) setHasDragged(true);
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
      if (upd) try { await updateDoc(doc(db, "events", evSave.id), { startTime: Timestamp.fromDate(upd.start), endTime: Timestamp.fromDate(upd.end), updatedAt: serverTimestamp() }); } catch { setEvents(p => p.map(ev => ev.id === evSave.id ? { ...ev, start: dragDataRef.current.originalStart, end: dragDataRef.current.originalEnd } : ev)); }
      isSavingRef.current = false;
    }
    setDraggingEvent(null); setResizingEvent(null); setHasDragged(false);
  }, [draggingEvent, resizingEvent, hasDragged, events]);

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
    const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
    const mins = Math.round(x / PIXELS_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
    const sd = new Date(currentDate); sd.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    const ed = new Date(sd); ed.setMinutes(ed.getMinutes() + 60);
    openNewEvent(sd, ed);
  };

  const isToday = currentDate.toDateString() === now.toDateString();
  const weekday = currentDate.toLocaleDateString(undefined, { weekday: "long" });
  const dayDate = currentDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const nowPos = (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE;
  const dayEvts = getDayEvts();
  const evtsRows = assignRows(dayEvts);
  const maxRow = Math.max(0, ...evtsRows.map(e => e.row));
  const tlHeight = (maxRow + 1) * (EVENT_HEIGHT + ROW_GAP) + 40;
  const upcoming = events.filter(ev => ev.start >= now).sort((a, b) => a.start - b.start).slice(0, 8);

  // Auth Screen
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bgLight, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="fade-in" style={{ background: "#fff", borderRadius: 24, padding: "48px 40px", maxWidth: 420, width: "100%", boxShadow: "0 25px 80px rgba(0,0,0,0.08)", textAlign: "center", border: `1px solid ${COLORS.stone[200]}` }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: COLORS.stone[900], marginBottom: 8 }}>Linear Calendar</h1>
            <p style={{ color: COLORS.stone[500], fontSize: 15 }}>Your time, beautifully organized</p>
          </div>
          <button onClick={() => signInWithPopup(auth, provider)} style={{ width: "100%", padding: "16px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)" }}>Continue with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: darkMode ? COLORS.bgDark : COLORS.bgLight, display: "flex" }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24 }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: darkMode ? COLORS.stone[100] : COLORS.stone[900], marginBottom: 2 }}>Welcome, {user?.displayName?.split(" ")[0] || "there"}</h1>
              <p style={{ fontSize: 13, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], fontStyle: "italic" }}>"{dailyQuote}"</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: darkMode ? COLORS.stone[800] : "#fff", borderRadius: 10, padding: 4, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
              {["day", "week", "year"].map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: viewMode === m ? "linear-gradient(135deg, #10b981, #059669)" : "transparent", color: viewMode === m ? "#fff" : darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{m}</button>
              ))}
            </div>
            <button onClick={goToToday} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : "#fff", color: darkMode ? COLORS.stone[300] : COLORS.stone[700], fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Today</button>
            <button onClick={() => setShowSettings(true)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : "#fff", color: darkMode ? COLORS.stone[400] : COLORS.stone[600], cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙</button>
            <button onClick={() => setShowDeletedOverlay(true)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : "#fff", color: darkMode ? COLORS.stone[400] : COLORS.stone[600], cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>🗑{deletedEvents.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ea580c", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{deletedEvents.length}</span>}</button>
            <button onClick={() => signOut(auth)} style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${COLORS.emerald[500]}`, background: user?.photoURL ? `url(${user.photoURL})` : COLORS.emerald[500], backgroundSize: "cover", cursor: "pointer" }} title="Sign out" />
          </div>
        </header>

        {/* Date Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => navDate(-1)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : "#fff", color: darkMode ? COLORS.stone[400] : COLORS.stone[600], cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
              <button onClick={() => navDate(1)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : "#fff", color: darkMode ? COLORS.stone[400] : COLORS.stone[600], cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: darkMode ? COLORS.stone[100] : COLORS.stone[900], fontFamily: "'Fraunces', serif" }}>
                  {viewMode === "day" ? weekday : viewMode === "week" ? `Week of ${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : currentDate.getFullYear()}
                </div>
                <div style={{ fontSize: 14, color: darkMode ? COLORS.stone[400] : COLORS.stone[500] }}>
                  {viewMode === "day" ? dayDate : viewMode === "week" ? `${weekDays[0].toLocaleDateString()} - ${weekDays[6].toLocaleDateString()}` : "Year Overview"}
                </div>
              </div>
              {isToday && viewMode === "day" && <div className="current-day-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.emerald[500], boxShadow: `0 0 0 4px ${COLORS.emerald[100]}` }} />}
            </div>
          </div>
          <button onClick={() => openNewEvent()} style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)" }}>+ New Event</button>
        </div>

        {/* Calendar Area */}
        <div style={{ flex: 1, background: darkMode ? COLORS.stone[800] : "#fff", borderRadius: 16, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          {/* DAY VIEW - LINEAR TIMELINE */}
          {viewMode === "day" && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", borderBottom: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[900] : COLORS.stone[50] }}>
                <div ref={timelineRef} style={{ display: "flex", overflowX: "auto", width: "100%" }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ minWidth: 60 * PIXELS_PER_MINUTE, padding: "12px 8px", fontSize: 12, fontWeight: 600, color: darkMode ? COLORS.stone[500] : COLORS.stone[400], borderRight: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[100]}` }}>
                      {use24HourFormat ? `${h.toString().padStart(2, "0")}:00` : `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? "AM" : "PM"}`}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
                <div onClick={handleTlClick} style={{ position: "relative", width: DAY_WIDTH, minHeight: Math.max(tlHeight, 200), cursor: "crosshair" }}>
                  {Array.from({ length: 24 }, (_, h) => <div key={h} style={{ position: "absolute", left: h * 60 * PIXELS_PER_MINUTE, top: 0, bottom: 0, width: 1, background: darkMode ? COLORS.stone[700] : COLORS.stone[100] }} />)}
                  {isToday && <div style={{ position: "absolute", left: nowPos, top: 0, bottom: 0, width: 2, background: COLORS.emerald[500], zIndex: 5 }}><div style={{ position: "absolute", top: 0, left: -4, width: 10, height: 10, borderRadius: "50%", background: COLORS.emerald[500] }} /></div>}
                  {evtsRows.map(ev => {
                    const st = getEvtStyle(ev, ev.row);
                    const cs = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald;
                    const isDrag = draggingEvent?.id === ev.id || resizingEvent?.id === ev.id;
                    return (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); if (!hasDragged) openEditEvent(ev); }} onMouseDown={e => handleEvtDown(e, ev)}
                        style={{ position: "absolute", left: st.left, top: st.top + 8, width: st.width, height: EVENT_HEIGHT, background: cs.bg, borderRadius: 10, padding: "8px 12px", cursor: isDrag ? "grabbing" : "grab", userSelect: "none", boxShadow: isDrag ? "0 8px 25px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.1)", transform: isDrag ? "scale(1.02)" : "scale(1)", transition: isDrag ? "none" : "all 0.2s", zIndex: isDrag ? 100 : 1 }}>
                        <div onMouseDown={e => handleEvtDown(e, ev, "left")} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize" }} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
                        <div onMouseDown={e => handleEvtDown(e, ev, "right")} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === "week" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", height: "100%" }}>
              {weekDays.map((day, idx) => {
                const dEvts = filteredEvents.filter(ev => ev.start.toDateString() === day.toDateString());
                const isTd = day.toDateString() === now.toDateString();
                return (
                  <div key={idx} onClick={() => goToDate(day)} style={{ borderRight: idx < 6 ? `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` : "none", padding: 12, cursor: "pointer", background: isTd ? (darkMode ? COLORS.emerald[900] + "40" : COLORS.emerald[50]) : "transparent" }}>
                    <div style={{ textAlign: "center", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: darkMode ? COLORS.stone[500] : COLORS.stone[400], textTransform: "uppercase", marginBottom: 4 }}>{day.toLocaleDateString(undefined, { weekday: "short" })}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: isTd ? COLORS.emerald[500] : darkMode ? COLORS.stone[200] : COLORS.stone[800], display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {day.getDate()}{isTd && <div className="current-day-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.emerald[500] }} />}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dEvts.slice(0, 4).map(ev => { const cs = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald; return (
                        <div key={ev.id} onClick={e => { e.stopPropagation(); openEditEvent(ev); }} style={{ padding: "6px 8px", borderRadius: 6, background: cs.light, borderLeft: `3px solid ${cs.border}`, cursor: "pointer" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? COLORS.stone[200] : COLORS.stone[800], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                          <div style={{ fontSize: 10, color: darkMode ? COLORS.stone[400] : COLORS.stone[500] }}>{fmtTime(ev.start)}</div>
                        </div>
                      ); })}
                      {dEvts.length > 4 && <div style={{ fontSize: 11, color: darkMode ? COLORS.stone[500] : COLORS.stone[400], textAlign: "center" }}>+{dEvts.length - 4} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* YEAR VIEW */}
          {viewMode === "year" && (
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
              {Array.from({ length: 12 }, (_, mi) => {
                const md = new Date(currentDate.getFullYear(), mi, 1);
                const dim = new Date(currentDate.getFullYear(), mi + 1, 0).getDate();
                const fd = md.getDay();
                const mEvts = filteredEvents.filter(ev => ev.start.getMonth() === mi && ev.start.getFullYear() === currentDate.getFullYear());
                return (
                  <div key={mi} style={{ background: darkMode ? COLORS.stone[900] : COLORS.stone[50], borderRadius: 12, padding: 16, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? COLORS.stone[200] : COLORS.stone[800], marginBottom: 12, textAlign: "center" }}>{md.toLocaleDateString(undefined, { month: "long" })}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ fontSize: 9, fontWeight: 600, color: darkMode ? COLORS.stone[600] : COLORS.stone[400], textAlign: "center", padding: 2 }}>{d}</div>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                      {Array.from({ length: fd }, (_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: dim }, (_, di) => {
                        const dn = di + 1, td = new Date(currentDate.getFullYear(), mi, dn), isTd = td.toDateString() === now.toDateString(), hasEv = mEvts.some(ev => ev.start.getDate() === dn);
                        return <div key={dn} onClick={() => goToDate(td)} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: isTd ? 700 : 500, color: isTd ? "#fff" : darkMode ? COLORS.stone[400] : COLORS.stone[600], background: isTd ? COLORS.emerald[500] : hasEv ? (darkMode ? COLORS.emerald[900] + "60" : COLORS.emerald[100]) : "transparent", borderRadius: 6, cursor: "pointer", position: "relative" }}>{dn}{hasEv && !isTd && <div style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: COLORS.emerald[500] }} />}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {loading && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "12px 24px", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>Loading...</div>}
      </div>

      {/* SIDEBAR */}
      {showSidebar && (
        <aside style={{ width: 280, background: darkMode ? COLORS.stone[900] : "#fff", borderLeft: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 16px", borderBottom: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: darkMode ? COLORS.stone[300] : COLORS.stone[700], textTransform: "uppercase" }}>Upcoming</h3>
            <button onClick={() => setShowSidebar(false)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: darkMode ? COLORS.stone[800] : COLORS.stone[100], color: darkMode ? COLORS.stone[500] : COLORS.stone[400], cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {upcoming.length === 0 ? <div style={{ textAlign: "center", padding: "40px 20px", color: darkMode ? COLORS.stone[500] : COLORS.stone[400] }}>No upcoming events</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map(ev => { const cs = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald; const isTd = ev.start.toDateString() === now.toDateString(); const isTom = ev.start.toDateString() === new Date(now.getTime() + 86400000).toDateString(); return (
                  <div key={ev.id} onClick={() => { goToDate(ev.start); openEditEvent(ev); }} style={{ padding: 12, borderRadius: 10, background: darkMode ? COLORS.stone[800] : COLORS.stone[50], borderLeft: `3px solid ${cs.border}`, cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? COLORS.stone[200] : COLORS.stone[800], marginBottom: 4 }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: darkMode ? COLORS.stone[500] : COLORS.stone[500] }}>
                      <span style={{ fontWeight: 600, color: isTd ? COLORS.emerald[500] : isTom ? COLORS.amber[500] : "inherit" }}>{isTd ? "Today" : isTom ? "Tomorrow" : ev.start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span> · {fmtTime(ev.start)}
                    </div>
                  </div>
                ); })}
              </div>
            )}
          </div>
          <div style={{ padding: 16, borderTop: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: darkMode ? COLORS.stone[500] : COLORS.stone[400], textTransform: "uppercase", marginBottom: 10 }}>Filter</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button onClick={() => setFilterCategory("All")} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${filterCategory === "All" ? COLORS.emerald[500] : darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: filterCategory === "All" ? COLORS.emerald[500] : "transparent", color: filterCategory === "All" ? "#fff" : darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
              {categories.map(cat => { const cs = EVENT_COLORS[cat.color] || EVENT_COLORS.emerald; const isA = filterCategory === cat.id; return (
                <button key={cat.id} onClick={() => setFilterCategory(cat.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${isA ? cs.border : darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: isA ? cs.light : "transparent", color: isA ? cs.border : darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cs.dot }} />{cat.name}
                </button>
              ); })}
            </div>
          </div>
        </aside>
      )}

      {!showSidebar && <button onClick={() => setShowSidebar(true)} style={{ position: "fixed", right: 0, top: "50%", transform: "translateY(-50%)", width: 32, height: 80, borderRadius: "8px 0 0 8px", border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "-4px 0 12px rgba(0,0,0,0.1)", zIndex: 50 }}>‹</button>}

      {/* EVENT MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div className="fade-in" onClick={e => e.stopPropagation()} style={{ background: darkMode ? COLORS.stone[800] : "#fff", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }}>{editingEvent ? "Edit Event" : "New Event"}</h3>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: darkMode ? COLORS.stone[700] : COLORS.stone[100], color: darkMode ? COLORS.stone[400] : COLORS.stone[500], cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 8, textTransform: "uppercase" }}>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[600] : COLORS.stone[300]}`, background: darkMode ? COLORS.stone[700] : "#fff", color: darkMode ? COLORS.stone[100] : COLORS.stone[900], fontSize: 15, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 8, textTransform: "uppercase" }}>Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.map(cat => { const cs = EVENT_COLORS[cat.color] || EVENT_COLORS.emerald; const isA = eventCategory === cat.id; return (
                    <button key={cat.id} onClick={() => setEventCategory(cat.id)} style={{ padding: "8px 14px", borderRadius: 8, border: `2px solid ${isA ? cs.border : darkMode ? COLORS.stone[600] : COLORS.stone[200]}`, background: isA ? cs.light : "transparent", color: isA ? cs.border : darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cs.dot }} />{cat.name}
                    </button>
                  ); })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 8, textTransform: "uppercase" }}>Start</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[600] : COLORS.stone[300]}`, background: darkMode ? COLORS.stone[700] : "#fff", color: darkMode ? COLORS.stone[100] : COLORS.stone[900], fontSize: 15 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 8, textTransform: "uppercase" }}>End</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[600] : COLORS.stone[300]}`, background: darkMode ? COLORS.stone[700] : "#fff", color: darkMode ? COLORS.stone[100] : COLORS.stone[900], fontSize: 15 }} />
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              {editingEvent && <button onClick={() => { softDeleteEvent(editingEvent.id); setShowModal(false); }} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #ea580c", background: "transparent", color: "#ea580c", fontSize: 14, fontWeight: 600, cursor: "pointer", marginRight: "auto" }}>Delete</button>}
              <button onClick={() => setShowModal(false)} style={{ padding: "12px 20px", borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[600] : COLORS.stone[300]}`, background: "transparent", color: darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEvent} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div className="fade-in" onClick={e => e.stopPropagation()} style={{ background: darkMode ? COLORS.stone[800] : "#fff", borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }}>Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: darkMode ? COLORS.stone[700] : COLORS.stone[100], color: darkMode ? COLORS.stone[400] : COLORS.stone[500], cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 12, textTransform: "uppercase" }}>Theme</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setDarkMode(false)} style={{ flex: 1, padding: 16, borderRadius: 12, border: `2px solid ${!darkMode ? COLORS.emerald[500] : darkMode ? COLORS.stone[600] : COLORS.stone[200]}`, background: !darkMode ? COLORS.emerald[50] : "transparent", cursor: "pointer", textAlign: "center" }}><span style={{ fontSize: 13, fontWeight: 600, color: !darkMode ? COLORS.emerald[600] : darkMode ? COLORS.stone[400] : COLORS.stone[600] }}>Light</span></button>
                  <button onClick={() => setDarkMode(true)} style={{ flex: 1, padding: 16, borderRadius: 12, border: `2px solid ${darkMode ? COLORS.emerald[500] : COLORS.stone[200]}`, background: darkMode ? COLORS.emerald[900] + "40" : "transparent", cursor: "pointer", textAlign: "center" }}><span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? COLORS.emerald[400] : COLORS.stone[600] }}>Dark</span></button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 12, textTransform: "uppercase" }}>Time Format</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setUse24HourFormat(false)} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: `2px solid ${!use24HourFormat ? COLORS.emerald[500] : darkMode ? COLORS.stone[600] : COLORS.stone[200]}`, background: !use24HourFormat ? COLORS.emerald[50] : "transparent", color: !use24HourFormat ? COLORS.emerald[600] : darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 14, fontWeight: 600, cursor: "pointer" }}>12-hour</button>
                  <button onClick={() => setUse24HourFormat(true)} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: `2px solid ${use24HourFormat ? COLORS.emerald[500] : darkMode ? COLORS.stone[600] : COLORS.stone[200]}`, background: use24HourFormat ? COLORS.emerald[50] : "transparent", color: use24HourFormat ? COLORS.emerald[600] : darkMode ? COLORS.stone[400] : COLORS.stone[600], fontSize: 14, fontWeight: 600, cursor: "pointer" }}>24-hour</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? COLORS.stone[400] : COLORS.stone[500], marginBottom: 12, textTransform: "uppercase" }}>Categories</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {categories.map((cat, idx) => { const cs = EVENT_COLORS[cat.color] || EVENT_COLORS.emerald; return (
                    <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: darkMode ? COLORS.stone[700] : COLORS.stone[50] }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: cs.dot }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: darkMode ? COLORS.stone[200] : COLORS.stone[700] }}>{cat.name}</span>
                      <button onClick={() => { if (categories.length > 1) setCategories(p => p.filter((_, i) => i !== idx)); }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: darkMode ? COLORS.stone[600] : COLORS.stone[200], color: darkMode ? COLORS.stone[400] : COLORS.stone[500], cursor: categories.length > 1 ? "pointer" : "not-allowed", opacity: categories.length > 1 ? 1 : 0.3 }}>✕</button>
                    </div>
                  ); })}
                </div>
              </div>
              <button onClick={() => signOut(auth)} style={{ padding: "14px 20px", borderRadius: 10, border: "1px solid #ea580c", background: "transparent", color: "#ea580c", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETED EVENTS */}
      {showDeletedOverlay && (
        <div onClick={() => setShowDeletedOverlay(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div className="fade-in" onClick={e => e.stopPropagation()} style={{ background: darkMode ? COLORS.stone[800] : "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }}>Deleted Events</h3>
              <button onClick={() => setShowDeletedOverlay(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: darkMode ? COLORS.stone[700] : COLORS.stone[100], color: darkMode ? COLORS.stone[400] : COLORS.stone[500], cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {deletedEvents.length === 0 ? <div style={{ textAlign: "center", padding: "40px 20px", color: darkMode ? COLORS.stone[500] : COLORS.stone[400] }}>No deleted events</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {deletedEvents.map(ev => { const cs = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald; return (
                    <div key={ev.id} style={{ padding: 16, borderRadius: 12, background: darkMode ? COLORS.stone[700] : COLORS.stone[50], borderLeft: `3px solid ${cs.border}` }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? COLORS.stone[200] : COLORS.stone[800], marginBottom: 4 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: darkMode ? COLORS.stone[500] : COLORS.stone[500], marginBottom: 12 }}>{ev.start?.toLocaleDateString()} - {ev.start && fmtTime(ev.start)}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => restoreEvent(ev.id)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: COLORS.emerald[500], color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Restore</button>
                        <button onClick={() => permanentlyDeleteEvent(ev.id)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ea580c", background: "transparent", color: "#ea580c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete Forever</button>
                      </div>
                    </div>
                  ); })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
