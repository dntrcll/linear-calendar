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
  Work: { bg: "linear-gradient(135deg, #667eea, #764ba2)", dot: "#667eea" },
  Personal: { bg: "linear-gradient(135deg, #43e97b, #38f9d7)", dot: "#43e97b" },
  Meeting: { bg: "linear-gradient(135deg, #fa709a, #fee140)", dot: "#fa709a" },
  Event: { bg: "linear-gradient(135deg, #4facfe, #00f2fe)", dot: "#4facfe" },
  Other: { bg: "linear-gradient(135deg, #a8edea, #fed6e3)", dot: "#a8edea" },
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

const SVGIcon = ({ type }) => {
  const icons = {
    menu: <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    plus: <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/></>,
    settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 1v6m0 6v6" stroke="currentColor" strokeWidth="2"/></>,
    trash: <><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" fill="none"/></>,
    close: <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    check: <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    chevronLeft: <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    chevronRight: <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    note: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 6h8M8 14h0m4 0h0m4 0h0m-8 4h0m4 0h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    search: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
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
  const [showCalculator, setShowCalculator] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("Personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [viewMode, setViewMode] = useState("year");
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
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrevious, setCalcPrevious] = useState(null);
  const [calcOperation, setCalcOperation] = useState(null);
  
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

  const handleCalc = value => {
    if (value === "C") {
      setCalcDisplay("0");
      setCalcPrevious(null);
      setCalcOperation(null);
    } else if (value === "=") {
      if (calcPrevious && calcOperation) {
        const curr = parseFloat(calcDisplay);
        const prev = parseFloat(calcPrevious);
        let result = 0;
        if (calcOperation === "+") result = prev + curr;
        else if (calcOperation === "-") result = prev - curr;
        else if (calcOperation === "×") result = prev * curr;
        else if (calcOperation === "÷") result = prev / curr;
        setCalcDisplay(result.toString());
        setCalcPrevious(null);
        setCalcOperation(null);
      }
    } else if (["+", "-", "×", "÷"].includes(value)) {
      setCalcPrevious(calcDisplay);
      setCalcOperation(value);
      setCalcDisplay("0");
    } else {
      setCalcDisplay(calcDisplay === "0" ? value : calcDisplay + value);
    }
  };

  const goToToday = () => setCurrentDate(new Date());
  const goToDate = date => { setCurrentDate(date); setViewMode("day"); };
  const getEventsForDate = date => date ? events.filter(ev => ev.start.toDateString() === date.toDateString()) : [];
  
  const getDaysInMonth = date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    let startDay = firstDay.getDay();
    if (weekStartsOnMonday) startDay = startDay === 0 ? 6 : startDay - 1;
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const getWeekDays = date => {
    const days = [];
    const current = new Date(date);
    let dayOfWeek = current.getDay();
    if (weekStartsOnMonday) dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getYearMonths = () => Array.from({ length: 12 }, (_, i) => new Date(currentDate.getFullYear(), i, 1));
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekHeaders = weekStartsOnMonday ? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "system-ui, sans-serif", padding: 20 }}>
        <div style={{ textAlign: "center", background: "#fff", padding: "48px 32px", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxWidth: 400 }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Timeline Calendar</h1>
          <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 16 }}>Linear calendar for the future</p>
          <button onClick={() => signInWithPopup(auth, provider)} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)" }}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "system-ui, sans-serif", color: "#fff" }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        .today-pulse { animation: pulse 2s ease-in-out infinite; }
        .timeline-scroll { -webkit-overflow-scrolling: touch; }
        .resize-handle { position: absolute; top: 0; bottom: 0; width: 12px; cursor: ew-resize; z-index: 10; }
        .resize-handle-left { left: 0; }
        .resize-handle-right { right: 0; }
      `}</style>

      {/* HEADER - Always Visible */}
      <div style={{ background: "rgba(15, 12, 41, 0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "16px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Welcome back,</div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{user.displayName || user.email?.split('@')[0] || 'User'}</h2>
            </div>
            <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 4 }}>
              {["day", "week", "month", "year"].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: viewMode === mode ? "linear-gradient(135deg, #667eea, #764ba2)" : "transparent", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{mode}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={goToToday} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", display: "flex", gap: 6 }}>
              <SVGIcon type="calendar" /> Today
            </button>
            <button onClick={openNewEvent} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", gap: 6 }}>
              <SVGIcon type="plus" /> Event
            </button>
            <button onClick={() => setShowTodoPanel(!showTodoPanel)} style={{ background: showTodoPanel ? "rgba(102, 126, 234, 0.3)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer", color: "#fff" }}>
              <SVGIcon type="note" />
            </button>
            <button onClick={() => setShowCalculator(!showCalculator)} style={{ background: showCalculator ? "rgba(102, 126, 234, 0.3)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer", color: "#fff" }}>
              <SVGIcon type="calculator" />
            </button>
            <button onClick={() => setShowSettings(true)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer", color: "#fff" }}>
              <SVGIcon type="settings" />
            </button>
          </div>
        </div>
        {error && (
          <div style={{ maxWidth: 1600, margin: "12px auto 0", padding: "10px 14px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5" }}>✕</button>
          </div>
        )}
      </div>

      {/* TODO PANEL */}
      {showTodoPanel && (
        <div style={{ position: "fixed", top: 70, right: 16, width: 300, maxHeight: "calc(100vh - 90px)", background: "rgba(15, 12, 41, 0.98)", borderRadius: 16, padding: 16, zIndex: 100, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Notes</h3>
            <button onClick={() => setShowTodoPanel(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyPress={e => e.key === "Enter" && addTodo()} placeholder="Add note..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14 }} />
            <button onClick={addTodo} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", cursor: "pointer" }}>+</button>
          </div>
          {todos.map(todo => (
            <div key={todo.id} style={{ display: "flex", gap: 8, padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
              <span style={{ flex: 1, textDecoration: todo.done ? "line-through" : "none", opacity: todo.done ? 0.5 : 1 }}>{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* CALCULATOR PANEL */}
      {showCalculator && (
        <div style={{ position: "fixed", top: 70, right: showTodoPanel ? 332 : 16, width: 280, background: "rgba(15, 12, 41, 0.98)", borderRadius: 16, padding: 16, zIndex: 100, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Calculator</h3>
            <button onClick={() => setShowCalculator(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8, marginBottom: 12, textAlign: "right", fontSize: 24, fontWeight: 600 }}>{calcDisplay}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["7","8","9","÷","4","5","6","×","1","2","3","-","0","C","=","+"].map(btn => (
              <button key={btn} onClick={() => handleCalc(btn)} style={{ padding: 16, borderRadius: 8, border: "none", background: ["÷","×","-","+","="].includes(btn) ? "linear-gradient(135deg, #667eea, #764ba2)" : btn === "C" ? "rgba(239, 68, 68, 0.3)" : "rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer" }}>
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LINEAR YEAR VIEW */}
      {viewMode === "year" && (
        <div style={{ padding: 20, maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ background: "#c00", color: "#fff", padding: "20px 0", textAlign: "center", borderRadius: "16px 16px 0 0" }}>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700 }}>CALENDAR {currentDate.getFullYear()}</h1>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 0, background: "#fff", borderRadius: "0 0 16px 16px" }}>
            {getYearMonths().map((month, idx) => {
              const monthDays = getDaysInMonth(month);
              return (
                <div key={idx} style={{ border: "1px solid #ddd", padding: 16 }}>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#000", textAlign: "center" }}>{monthNames[idx]}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                    {weekHeaders.map((d, i) => (
                      <div key={i} style={{ textAlign: "center", fontSize: 9, color: i === 0 || i === 6 ? "#c00" : "#666", fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {monthDays.map((day, i) => {
                      const isTodayCell = day && day.toDateString() === now.toDateString();
                      const dayEvts = day ? getEventsForDate(day) : [];
                      const isSun = day && day.getDay() === 0;
                      const isSat = day && day.getDay() === 6;
                      return (
                        <div key={i} onClick={() => day && goToDate(day)} className={isTodayCell ? "today-pulse" : ""} style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 4, background: day ? (isTodayCell ? "#000" : "#fff") : "transparent", color: day ? (isTodayCell ? "#fff" : (isSun || isSat ? "#c00" : "#000")) : "transparent", fontSize: 11, cursor: day ? "pointer" : "default", border: day ? "1px solid #e5e5e5" : "none", position: "relative" }}>
                          {day ? day.getDate() : ""}
                          {dayEvts.length > 0 && (
                            <div style={{ position: "absolute", bottom: 2, display: "flex", gap: 1 }}>
                              {dayEvts.slice(0, 3).map((ev, i) => (
                                <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: CATEGORY_COLORS[ev.category || "Personal"].dot }} />
                              ))}
                            </div>
                          )}
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

      {/* DAY VIEW WITH TIMELINE */}
      {viewMode === "day" && (
        <div style={{ padding: 20, maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div ref={timelineRef} className="timeline-scroll" style={{ overflowX: "auto" }} onClick={handleTimelineClick}>
              <div style={{ position: "relative", width: DAY_WIDTH, minHeight: 400, padding: "20px 0" }}>
                {[...Array(96)].map((_, i) => {
                  const isHour = i % 4 === 0;
                  return <div key={i} style={{ position: "absolute", left: i * 15 * PIXELS_PER_MINUTE, top: 0, bottom: 0, width: isHour ? 2 : 1, background: isHour ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", zIndex: 1 }} />;
                })}
                {[...Array(24)].map((_, h) => (
                  <div key={h} style={{ position: "absolute", left: h * 60 * PIXELS_PER_MINUTE + 8, top: 12, fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 700, background: "rgba(15, 12, 41, 0.9)", padding: "4px 8px", borderRadius: 6, zIndex: 2 }}>
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
                {isToday && (
                  <>
                    <div style={{ position: "absolute", left: nowLeft, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg, #667eea, #764ba2)", zIndex: 10, boxShadow: "0 0 20px rgba(102, 126, 234, 0.8)" }} />
                    <div className="today-pulse" style={{ position: "absolute", left: nowLeft - 6, top: 8, width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", zIndex: 11 }} />
                  </>
                )}
                {stacked.map(ev => {
                  const width = toLeft(ev.end) - toLeft(ev.start);
                  const isDragging = draggingEvent?.id === ev.id;
                  const isResizing = resizingEvent?.id === ev.id;
                  return (
                    <div key={ev.id} data-event-id={ev.id} onMouseDown={e => {if (!e.target.classList.contains('resize-handle')) handleDragStart(e, ev);}} onClick={e => {if (Math.abs(e.clientX - dragStartX) < 5) openEditEvent(ev);}} style={{ position: "absolute", left: toLeft(ev.start), top: 70 + ev.row * (EVENT_HEIGHT + ROW_GAP), width, height: EVENT_HEIGHT, background: CATEGORY_COLORS[ev.category || "Personal"].bg, color: "#fff", borderRadius: 12, padding: "12px 14px", cursor: "grab", boxShadow: "0 4px 15px rgba(0,0,0,0.3)", zIndex: 5 }}>
                      <div className="resize-handle resize-handle-left" onMouseDown={e => handleResizeStart(e, ev, 'left')} />
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{formatTime(ev.start)} – {formatTime(ev.end)}</div>
                      <div className="resize-handle resize-handle-right" onMouseDown={e => handleResizeStart(e, ev, 'right')} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div style={{ padding: 20, maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {getWeekDays(currentDate).map((day, i) => {
              const dayEvts = getEventsForDate(day);
              const isTodayCell = day.toDateString() === now.toDateString();
              return (
                <div key={i} onClick={() => goToDate(day)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, cursor: "pointer", minHeight: 180 }}>
                  <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{day.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: isTodayCell ? "#fff" : "rgba(255,255,255,0.9)", background: isTodayCell ? "linear-gradient(135deg, #667eea, #764ba2)" : "transparent", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      {day.getDate()}
                    </div>
                  </div>
                  {dayEvts.slice(0, 3).map(ev => (
                    <div key={ev.id} onClick={e => {e.stopPropagation(); openEditEvent(ev);}} style={{ background: CATEGORY_COLORS[ev.category || "Personal"].bg, color: "#fff", padding: "6px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvts.length > 3 && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>+{dayEvts.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 12 }}>
              {weekHeaders.map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {getDaysInMonth(currentDate).map((day, i) => {
                const isTodayCell = day && day.toDateString() === now.toDateString();
                return (
                  <div key={i} onClick={() => day && goToDate(day)} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: day ? (isTodayCell ? "linear-gradient(135deg, #667eea, #764ba2)" : "rgba(255,255,255,0.03)") : "transparent", color: day ? "#fff" : "transparent", fontWeight: isTodayCell ? 700 : 500, fontSize: 13, cursor: day ? "pointer" : "default", border: day ? "1px solid rgba(255,255,255,0.1)" : "none", minHeight: 40 }}>
                    {day ? day.getDate() : ""}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(15, 12, 41, 0.98)", width: "100%", maxWidth: 440, borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ margin: "0 0 20px 0" }}>Settings</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", gap: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={use24Hour} onChange={e => setUse24Hour(e.target.checked)} />
                <span>Use 24-hour time</span>
              </label>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", gap: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={weekStartsOnMonday} onChange={e => setWeekStartsOnMonday(e.target.checked)} />
                <span>Week starts on Monday</span>
              </label>
            </div>
            <button onClick={() => setShowDeletedOverlay(true)} style={{ width: "100%", marginTop: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, cursor: "pointer", color: "#fff", fontWeight: 600 }}>
              Deleted Events
            </button>
            <button onClick={() => signOut(auth)} style={{ width: "100%", marginTop: 12, background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 14, cursor: "pointer", color: "#fca5a5", fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(15, 12, 41, 0.98)", borderRadius: 20, width: "100%", maxWidth: 480, padding: 24, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ margin: "0 0 20px 0" }}>{editingEvent ? "Edit Event" : "New Event"}</h3>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setEventCategory(cat)} style={{ padding: "8px 16px", borderRadius: 8, border: eventCategory === cat ? "2px solid #667eea" : "2px solid rgba(255,255,255,0.1)", background: eventCategory === cat ? "rgba(102, 126, 234, 0.2)" : "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  {cat}
                </button>
              ))}
            </div>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15, boxSizing: "border-box" }} />
            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 20, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={saveEvent} style={{ flex: 1, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, cursor: "pointer", fontSize: 16 }}>Save</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, fontWeight: 600, cursor: "pointer", color: "#fff", fontSize: 16 }}>Cancel</button>
            </div>
            {editingEvent && (
              <button onClick={deleteEvent} style={{ width: "100%", marginTop: 12, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 12, padding: 14, cursor: "pointer", color: "#fca5a5", fontWeight: 600 }}>Delete</button>
            )}
          </div>
        </div>
      )}

      {/* DELETED EVENTS */}
      {showDeletedOverlay && (
        <div onClick={() => setShowDeletedOverlay(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(15, 12, 41, 0.98)", width: "100%", maxWidth: 440, maxHeight: "85vh", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ padding: 20, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 style={{ margin: 0 }}>Deleted Events</h3>
            </div>
            <div style={{ padding: 24, overflowY: "auto", maxHeight: "calc(85vh - 80px)" }}>
              {deletedEvents.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: 40 }}>No deleted events</div>
              ) : (
                deletedEvents.map(ev => (
                  <div key={ev.id} style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.title}</div>
                    <button onClick={() => restoreEvent(ev)} style={{ marginTop: 8, background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Restore</button>
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