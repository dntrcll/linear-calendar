import { useEffect, useState, useRef } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const PIXELS_PER_MINUTE = 3;
const EVENT_HEIGHT = 56;
const ROW_GAP = 12;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

const CATEGORY_COLORS = {
  Work: { bg: "linear-gradient(135deg, #667eea, #764ba2)", dot: "#667eea", light: "#eef2ff", text: "#4338ca" },
  Personal: { bg: "linear-gradient(135deg, #43e97b, #38f9d7)", dot: "#43e97b", light: "#ecfdf5", text: "#065f46" },
  Meeting: { bg: "linear-gradient(135deg, #fa709a, #fee140)", dot: "#fa709a", light: "#fef3c7", text: "#92400e" },
  Event: { bg: "linear-gradient(135deg, #4facfe, #00f2fe)", dot: "#4facfe", light: "#dbeafe", text: "#075985" },
  Other: { bg: "linear-gradient(135deg, #a8edea, #fed6e3)", dot: "#a8edea", light: "#fce7f3", text: "#9f1239" },
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

const SVGIcon = ({ type }) => {
  const icons = {
    plus: <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/></>,
    settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-1.8 1.8l-4.2 4.2m13.2-5.2l-6 0m-6 0l-6 0m13.2 5.2l-4.2-4.2m-1.8-1.8l-4.2-4.2" stroke="currentColor" strokeWidth="2"/></>,
    trash: <><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" fill="none"/></>,
    close: <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    note: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    search: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    chevronLeft: <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    chevronRight: <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    analytics: <><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
  };
  
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      {icons[type]}
    </svg>
  );
};

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);
  const [familySpaceId, setFamilySpaceId] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("Personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [viewMode, setViewMode] = useState("day");
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [use24Hour, setUse24Hour] = useState(() => {
    const saved = localStorage.getItem('use24Hour');
    return saved ? JSON.parse(saved) : false;
  });

  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(() => {
    const saved = localStorage.getItem('weekStartsOnMonday');
    return saved ? JSON.parse(saved) : false;
  });

  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [previewTimes, setPreviewTimes] = useState(null);
  const [todoInput, setTodoInput] = useState("");
  
  const timelineRef = useRef(null);
  const isSavingRef = useRef(false);
  const previewTimesRef = useRef(null);
  const currentStartMinutesRef = useRef(null);
  const currentEndMinutesRef = useRef(null);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(err => console.error("Auth error:", err));
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) setTodos(JSON.parse(savedTodos));
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('use24Hour', JSON.stringify(use24Hour));
  }, [use24Hour]);

  useEffect(() => {
    localStorage.setItem('weekStartsOnMonday', JSON.stringify(weekStartsOnMonday));
  }, [weekStartsOnMonday]);

  const loadEvents = async () => {
    if (!user || !spaceId) return;
    try {
      setLoading(true);
      const activeQ = query(collection(db, "events"), where("spaceId", "==", spaceId), where("deleted", "==", false));
      const deletedQ = query(collection(db, "events"), where("spaceId", "==", spaceId), where("deleted", "==", true));
      const [activeSnap, deletedSnap] = await Promise.all([getDocs(activeQ), getDocs(deletedQ)]);
      setEvents(activeSnap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
      setDeletedEvents(deletedSnap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime?.toDate(), end: d.data().endTime?.toDate() })));
    } catch (err) {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user, spaceId]);

  const createFamilySpace = async () => {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ref = await addDoc(collection(db, "spaces"), {
        name: "Family",
        ownerId: user.uid,
        members: [user.uid],
        type: "shared",
        inviteCode: code,
        createdAt: serverTimestamp(),
      });
      setFamilySpaceId(ref.id);
      setSpaceId(ref.id);
      setInviteCode(code);
      setShowInviteModal(true);
    } catch (err) {
      setError("Failed to create family space");
    }
  };

  const formatTime = d => use24Hour ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

  const openNewEvent = (presetStart = null, presetEnd = null) => {
    setEditingEvent(null);
    setTitle("");
    setEventCategory("Personal");
    if (presetStart && presetEnd) {
      setStartTime(presetStart.toISOString().slice(0, 16));
      setEndTime(presetEnd.toISOString().slice(0, 16));
    } else {
      const start = new Date(currentDate);
      start.setHours(now.getHours(), 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      setStartTime(start.toISOString().slice(0, 16));
      setEndTime(end.toISOString().slice(0, 16));
    }
    setShowModal(true);
  };

  const openEditEvent = ev => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setEventCategory(ev.category || "Personal");
    setStartTime(ev.start.toISOString().slice(0, 16));
    setEndTime(ev.end.toISOString().slice(0, 16));
    setShowModal(true);
  };

  const saveEvent = async () => {
    if (!title || !startTime || !endTime) return setError("Fill all fields");
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (endDate <= startDate) return setError("End must be after start");
    try {
      setLoading(true);
      if (editingEvent) {
        await updateDoc(doc(db, "events", editingEvent.id), { title, startTime: Timestamp.fromDate(startDate), endTime: Timestamp.fromDate(endDate), category: eventCategory });
      } else {
        await addDoc(collection(db, "events"), { spaceId, title, startTime: Timestamp.fromDate(startDate), endTime: Timestamp.fromDate(endDate), category: eventCategory, deleted: false, createdAt: serverTimestamp() });
      }
      setShowModal(false);
      await loadEvents();
    } catch (err) {
      setError("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent || !window.confirm("Delete?")) return;
    try {
      await updateDoc(doc(db, "events", editingEvent.id), { deleted: true, deletedAt: serverTimestamp() });
      setShowModal(false);
      await loadEvents();
    } catch (err) {
      setError("Failed to delete");
    }
  };

  const restoreEvent = async ev => {
    try {
      await updateDoc(doc(db, "events", ev.id), { deleted: false });
      await loadEvents();
    } catch (err) {
      setError("Failed to restore");
    }
  };

  const addTodo = () => {
    if (!todoInput.trim()) return;
    setTodos([...todos, { id: Date.now(), text: todoInput, done: false }]);
    setTodoInput("");
  };

  const toggleTodo = id => setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTodo = id => setTodos(todos.filter(t => t.id !== id));

  const goToToday = () => setCurrentDate(new Date());
  const goToPreviousDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const goToNextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };
  
  const getEventsForDate = date => date ? events.filter(ev => ev.start.toDateString() === date.toDateString()) : [];

  const today = currentDate;
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const toLeft = d => ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;
  const nowLeft = toLeft(now);
  const isToday = today.toDateString() === now.toDateString();

  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || ev.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  
  const dayEvents = filteredEvents.filter(ev => ev.start.toDateString() === today.toDateString());
  const stacked = [];
  dayEvents.forEach(ev => {
    let row = 0;
    while (stacked.some(e => e.row === row && !(ev.end <= e.start || ev.start >= e.end))) row++;
    stacked.push({ ...ev, row });
  });

  const handleTimelineClick = e => {
    if (draggingEvent || resizingEvent) return;
    const timeline = timelineRef.current;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const scrollLeft = timeline.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const minutes = Math.round((clickX / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES;
    const clampedMinutes = Math.max(0, Math.min(minutes, 1440 - 60));
    const startDate = new Date(startOfDay.getTime() + clampedMinutes * 60000);
    const endDate = new Date(startDate.getTime() + 60 * 60000);
    openNewEvent(startDate, endDate);
  };

  const handleResizeStart = (e, ev, handle) => {
    e.stopPropagation();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    setResizingEvent(ev);
    setResizeHandle(handle);
    setDragStartX(clientX);
    const startMinutes = ((ev.start - startOfDay) / 60000);
    const endMinutes = ((ev.end - startOfDay) / 60000);
    currentStartMinutesRef.current = startMinutes;
    currentEndMinutesRef.current = endMinutes;
    const times = { start: ev.start, end: ev.end };
    setPreviewTimes(times);
    previewTimesRef.current = times;
  };

  const handleDragStart = (e, ev) => {
    e.stopPropagation();
    const timeline = timelineRef.current;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const scrollLeft = timeline.scrollLeft;
    setDraggingEvent(ev);
    setDragStartX(clientX);
    const eventLeft = toLeft(ev.start);
    const mousePositionInTimeline = clientX - rect.left + scrollLeft;
    setDragOffset(mousePositionInTimeline - eventLeft);
    const startMinutes = ((ev.start - startOfDay) / 60000);
    const endMinutes = ((ev.end - startOfDay) / 60000);
    currentStartMinutesRef.current = startMinutes;
    currentEndMinutesRef.current = endMinutes;
    const times = { start: ev.start, end: ev.end };
    setPreviewTimes(times);
    previewTimesRef.current = times;
  };

  useEffect(() => {
    if (draggingEvent || resizingEvent) {
      const handleMove = () => {};
      const handleEnd = async () => {
        if (!previewTimesRef.current) return;
        isSavingRef.current = true;
        const newStart = previewTimesRef.current.start;
        const newEnd = previewTimesRef.current.end;
        try {
          await updateDoc(doc(db, "events", (draggingEvent || resizingEvent).id), {
            startTime: Timestamp.fromDate(newStart),
            endTime: Timestamp.fromDate(newEnd),
          });
          await loadEvents();
        } catch (err) {
          setError("Failed to update");
        }
        isSavingRef.current = false;
        setDraggingEvent(null);
        setResizingEvent(null);
        setPreviewTimes(null);
        previewTimesRef.current = null;
      };
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
      return () => {
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [draggingEvent, resizingEvent]);

  const monthYear = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayName = today.toLocaleDateString(undefined, { weekday: "long" });
  const dayDate = today.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: darkMode ? "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" : "#f8f9fa", fontFamily: "system-ui, sans-serif", padding: 20 }}>
        <div style={{ textAlign: "center", background: "#fff", padding: "48px 32px", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxWidth: 400 }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Timeline Calendar</h1>
          <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 16 }}>Linear calendar for the future</p>
          <button onClick={() => signInWithPopup(auth, provider)} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)" }}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  const bgColor = darkMode ? "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" : "#f8f9fa";
  const cardBg = darkMode ? "rgba(255,255,255,0.05)" : "#fff";
  const textColor = darkMode ? "#fff" : "#1f2937";
  const borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const inputBg = darkMode ? "rgba(255,255,255,0.05)" : "#fff";
  const mutedText = darkMode ? "rgba(255,255,255,0.6)" : "#6b7280";

  return (
    <div style={{ minHeight: "100vh", background: bgColor, fontFamily: "system-ui, sans-serif", color: textColor }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        .today-pulse { animation: pulse 2s ease-in-out infinite; }
        .timeline-scroll { -webkit-overflow-scrolling: touch; overflow-x: auto; }
        .timeline-scroll::-webkit-scrollbar { display: none; }
        .timeline-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .resize-handle { position: absolute; top: 0; bottom: 0; width: 12px; cursor: ew-resize; z-index: 10; }
        .resize-handle-left { left: 0; }
        .resize-handle-right { right: 0; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${borderColor}`, padding: "24px 32px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: "0 0 4px 0", fontSize: 24, fontWeight: 700 }}>Welcome, {user.displayName || user.email?.split('@')[0] || 'User'}</h1>
              <p style={{ margin: 0, color: mutedText, fontSize: 14 }}>{monthYear}</p>
            </div>
            <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid" + borderColor, borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: mutedText, fontSize: 14, fontWeight: 500 }}>
              Sign out
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: mutedText }}>
              <SVGIcon type="search" />
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "12px 12px 12px 44px", borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, outline: "none", transition: "border 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor = "#667eea"}
              onBlur={e => e.currentTarget.style.borderColor = borderColor}
            />
          </div>

          {/* Space & Category Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setSpaceId(PERSONAL_SPACE_ID)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: spaceId === PERSONAL_SPACE_ID ? "linear-gradient(135deg, #667eea, #764ba2)" : inputBg, color: spaceId === PERSONAL_SPACE_ID ? "#fff" : textColor, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: spaceId === PERSONAL_SPACE_ID ? "0 2px 8px rgba(102, 126, 234, 0.3)" : "none" }}>
              Personal
            </button>
            <button onClick={() => familySpaceId ? setSpaceId(familySpaceId) : createFamilySpace()} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${borderColor}`, background: spaceId === familySpaceId ? "linear-gradient(135deg, #667eea, #764ba2)" : "transparent", color: spaceId === familySpaceId ? "#fff" : textColor, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              + Create Family
            </button>
            <button onClick={() => setFilterCategory("All")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: filterCategory === "All" ? "#e0e7ff" : "transparent", color: filterCategory === "All" ? "#4338ca" : textColor, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              All
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: filterCategory === cat ? CATEGORY_COLORS[cat].light : "transparent", color: filterCategory === cat ? CATEGORY_COLORS[cat].text : textColor, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                {cat}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["Day", "Week", "Month"].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode.toLowerCase())} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: viewMode === mode.toLowerCase() ? "linear-gradient(135deg, #667eea, #764ba2)" : inputBg, color: viewMode === mode.toLowerCase() ? "#fff" : textColor, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: viewMode === mode.toLowerCase() ? "0 2px 8px rgba(102, 126, 234, 0.3)" : "none" }}>
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={goToPreviousDay} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SVGIcon type="chevronLeft" />
            </button>
            <button onClick={goToToday} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Today
            </button>
            <button onClick={goToNextDay} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SVGIcon type="chevronRight" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD EVENT BUTTON */}
      <div style={{ padding: "0 32px", maxWidth: 1600, margin: "20px auto" }}>
        <button onClick={() => openNewEvent()} style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <SVGIcon type="plus" />
          Add Event
        </button>
      </div>

      {/* DAY VIEW TIMELINE */}
      {viewMode === "day" && (
        <div style={{ padding: "0 32px 32px", maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: mutedText }}>
              Click timeline or "+ Add Event" to create
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{dayName}</div>
              <div style={{ fontSize: 14, color: mutedText }}>{dayDate}</div>
            </div>
          </div>

          <div style={{ background: cardBg, borderRadius: 16, overflow: "hidden", border: `1px solid ${borderColor}`, boxShadow: darkMode ? "0 4px 12px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div ref={timelineRef} className="timeline-scroll" onClick={handleTimelineClick}>
              <div style={{ position: "relative", width: DAY_WIDTH, minHeight: 500, padding: "20px 0" }}>
                {[...Array(24)].map((_, h) => (
                  <div key={h} style={{ position: "absolute", left: h * 60 * PIXELS_PER_MINUTE, top: 0, bottom: 0, borderLeft: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "#f3f4f6"}`, paddingLeft: 12, paddingTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: mutedText }}>
                      {String(h).padStart(2, "0")}:00
                    </div>
                  </div>
                ))}

                {isToday && (
                  <>
                    <div style={{ position: "absolute", left: nowLeft, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, #667eea, #764ba2)", zIndex: 10 }} />
                    <div className="today-pulse" style={{ position: "absolute", left: nowLeft - 5, top: 8, width: 12, height: 12, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", zIndex: 11 }} />
                  </>
                )}

                {stacked.length === 0 && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: mutedText }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>No events today</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Click timeline or "+ Add Event" to create</div>
                  </div>
                )}

                {stacked.map(ev => {
                  const width = toLeft(ev.end) - toLeft(ev.start);
                  const isSmall = width < 180;
                  const isDragging = draggingEvent?.id === ev.id;
                  const isResizing = resizingEvent?.id === ev.id;
                  return (
                    <div key={ev.id} data-event-id={ev.id} onMouseDown={e => {if (!e.target.classList.contains('resize-handle')) handleDragStart(e, ev);}} onClick={e => {if (Math.abs(e.clientX - dragStartX) < 5) openEditEvent(ev);}} style={{ position: "absolute", left: toLeft(ev.start), top: 70 + ev.row * (EVENT_HEIGHT + ROW_GAP), width, height: EVENT_HEIGHT, background: CATEGORY_COLORS[ev.category || "Personal"].bg, color: "#fff", borderRadius: 12, padding: "12px 14px", cursor: "grab", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "all 0.2s ease", overflow: "hidden", zIndex: 5 }}>
                      <div className="resize-handle resize-handle-left" onMouseDown={e => handleResizeStart(e, ev, 'left')} />
                      <div style={{ fontWeight: 600, fontSize: isSmall ? 13 : 15, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{ev.title}</div>
                      {!isSmall && <div style={{ fontSize: 12, opacity: 0.95, pointerEvents: "none" }}>{formatTime(ev.start)} – {formatTime(ev.end)}</div>}
                      <div className="resize-handle resize-handle-right" onMouseDown={e => handleResizeStart(e, ev, 'right')} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Floating Action Buttons */}
          <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 12, zIndex: 50 }}>
            <button onClick={() => setShowTodoPanel(!showTodoPanel)} style={{ width: 56, height: 56, borderRadius: "50%", border: "none", background: showTodoPanel ? "linear-gradient(135deg, #667eea, #764ba2)" : cardBg, color: showTodoPanel ? "#fff" : textColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <SVGIcon type="note" />
            </button>
            <button onClick={() => setShowSettings(true)} style={{ width: 56, height: 56, borderRadius: "50%", border: "none", background: cardBg, color: textColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <SVGIcon type="settings" />
            </button>
          </div>
        </div>
      )}

      {/* TODO PANEL */}
      {showTodoPanel && (
        <div style={{ position: "fixed", top: 24, right: 24, width: 320, maxHeight: "calc(100vh - 48px)", background: cardBg, borderRadius: 16, padding: 20, zIndex: 100, border: `1px solid ${borderColor}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Quick Notes</h3>
            <button onClick={() => setShowTodoPanel(false)} style={{ background: "none", border: "none", color: textColor, cursor: "pointer", padding: 4 }}><SVGIcon type="close" /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyPress={e => e.key === "Enter" && addTodo()} placeholder="Add a note..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 14, outline: "none" }} />
            <button onClick={addTodo} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none", borderRadius: 8, padding: "10px 16px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>+</button>
          </div>
          {todos.map(todo => (
            <div key={todo.id} style={{ display: "flex", gap: 10, padding: 10, background: darkMode ? "rgba(255,255,255,0.03)" : "#f9fafb", borderRadius: 8, marginBottom: 8, alignItems: "center" }}>
              <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} style={{ cursor: "pointer", width: 18, height: 18 }} />
              <span style={{ flex: 1, textDecoration: todo.done ? "line-through" : "none", opacity: todo.done ? 0.5 : 1, fontSize: 14 }}>{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: cardBg, width: "100%", maxWidth: 480, borderRadius: 20, padding: 28, border: `1px solid ${borderColor}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 22, fontWeight: 700 }}>Settings</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 0" }}>
                <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} style={{ cursor: "pointer", width: 20, height: 20 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Dark Mode</div>
                  <div style={{ fontSize: 13, color: mutedText, marginTop: 2 }}>Toggle dark/light theme</div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 0" }}>
                <input type="checkbox" checked={use24Hour} onChange={e => setUse24Hour(e.target.checked)} style={{ cursor: "pointer", width: 20, height: 20 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>24-Hour Time</div>
                  <div style={{ fontSize: 13, color: mutedText, marginTop: 2 }}>Use 24-hour time format</div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 0" }}>
                <input type="checkbox" checked={weekStartsOnMonday} onChange={e => setWeekStartsOnMonday(e.target.checked)} style={{ cursor: "pointer", width: 20, height: 20 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Week Starts Monday</div>
                  <div style={{ fontSize: 13, color: mutedText, marginTop: 2 }}>Start week on Monday instead of Sunday</div>
                </div>
              </label>
            </div>

            <button onClick={() => setShowDeletedOverlay(true)} style={{ width: "100%", marginBottom: 12, background: darkMode ? "rgba(255,255,255,0.05)" : "#f3f4f6", border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14, cursor: "pointer", color: textColor, fontWeight: 600, fontSize: 15 }}>
              View Deleted Events
            </button>

            <button onClick={() => setShowSettings(false)} style={{ width: "100%", background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none", borderRadius: 12, padding: 14, cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: 15 }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: cardBg, borderRadius: 20, width: "100%", maxWidth: 520, padding: 28, border: `1px solid ${borderColor}`, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 24, fontWeight: 700 }}>{editingEvent ? "Edit Event" : "New Event"}</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: mutedText }}>Event Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 16, boxSizing: "border-box", outline: "none", transition: "border 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#667eea"} onBlur={e => e.currentTarget.style.borderColor = borderColor} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: mutedText }}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map(cat => {
                  const catStyle = CATEGORY_COLORS[cat];
                  return (
                    <button key={cat} onClick={() => setEventCategory(cat)} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: eventCategory === cat ? catStyle.light : (darkMode ? "rgba(255,255,255,0.05)" : "#f3f4f6"), color: eventCategory === cat ? catStyle.text : textColor, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: mutedText }}>Start</label>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: "100%", padding: "14px 12px", borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: mutedText }}>End</label>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: "100%", padding: "14px 12px", borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={saveEvent} disabled={loading} style={{ flex: 1, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", borderRadius: 12, padding: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: 16, boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)" }}>
                {loading ? "Saving..." : "Save Event"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.05)" : "#f3f4f6", border: "none", borderRadius: 12, padding: 16, fontWeight: 600, cursor: "pointer", color: textColor, fontSize: 16 }}>
                Cancel
              </button>
            </div>

            {editingEvent && (
              <button onClick={deleteEvent} style={{ width: "100%", marginTop: 12, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 12, padding: 14, cursor: "pointer", color: "#ef4444", fontWeight: 600, fontSize: 15 }}>
                Delete Event
              </button>
            )}
          </div>
        </div>
      )}

      {/* DELETED EVENTS */}
      {showDeletedOverlay && (
        <div onClick={() => setShowDeletedOverlay(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: cardBg, width: "100%", maxWidth: 480, maxHeight: "85vh", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: `1px solid ${borderColor}` }}>
            <div style={{ padding: 24, borderBottom: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Deleted Events</h3>
              <button onClick={() => setShowDeletedOverlay(false)} style={{ border: "none", background: darkMode ? "rgba(255,255,255,0.1)" : "#f3f4f6", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <SVGIcon type="close" />
              </button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", maxHeight: "calc(85vh - 80px)" }}>
              {deletedEvents.length === 0 ? (
                <div style={{ textAlign: "center", color: mutedText, padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
                  <div>No deleted events</div>
                </div>
              ) : (
                deletedEvents.map(ev => (
                  <div key={ev.id} style={{ padding: "16px 0", borderBottom: `1px solid ${borderColor}` }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{ev.title}</div>
                    {ev.deletedAt && <div style={{ fontSize: 13, color: mutedText, marginBottom: 12 }}>Deleted {ev.deletedAt.toDate().toLocaleString()}</div>}
                    <button onClick={() => restoreEvent(ev)} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}