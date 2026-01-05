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
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const PIXELS_PER_MINUTE = 2;
const EVENT_HEIGHT = 48;
const ROW_GAP = 8;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

const EVENT_COLORS = {
  blue: { bg: "linear-gradient(135deg, #3B82F6, #2563EB)", border: "#3B82F6", dot: "#3B82F6" },
  teal: { bg: "linear-gradient(135deg, #14B8A6, #0D9488)", border: "#14B8A6", dot: "#14B8A6" },
  green: { bg: "linear-gradient(135deg, #10B981, #059669)", border: "#10B981", dot: "#10B981" },
  purple: { bg: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "#8B5CF6", dot: "#8B5CF6" },
  amber: { bg: "linear-gradient(135deg, #F59E0B, #D97706)", border: "#F59E0B", dot: "#F59E0B" },
  orange: { bg: "linear-gradient(135deg, #F97316, #EA580C)", border: "#F97316", dot: "#F97316" },
  red: { bg: "linear-gradient(135deg, #EF4444, #DC2626)", border: "#EF4444", dot: "#EF4444" },
  cyan: { bg: "linear-gradient(135deg, #06B6D4, #0891B2)", border: "#06B6D4", dot: "#06B6D4" },
};

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "blue" },
  { id: "project", name: "Project", color: "teal" },
  { id: "deadline", name: "Deadline", color: "red" },
  { id: "personal", name: "Personal", color: "amber" },
];

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  
  const MOTIVATIONAL_QUOTES = [
    "Every day is a fresh start.",
    "Small progress is still progress.",
    "You're doing better than you think.",
    "Focus on what you can control.",
    "One step at a time.",
    "Your future self will thank you.",
    "Make today count.",
    "Progress over perfection.",
    "You've got this.",
    "Consistency beats intensity.",
    "Trust the process.",
    "Your only limit is you.",
  ];
  
  const getMotivationalQuote = () => {
    const hours = new Date().getHours();
    const index = Math.floor(hours / 4) % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[index];
  };
  
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);
  const [familySpaceId, setFamilySpaceId] = useState(null);

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("Work");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  const [viewMode, setViewMode] = useState("day");
  
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  
  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(() => {
    const saved = localStorage.getItem('weekStartsOnMonday');
    return saved ? JSON.parse(saved) : false;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [use24HourFormat, setUse24HourFormat] = useState(() => {
    const saved = localStorage.getItem('use24HourFormat');
    return saved ? JSON.parse(saved) : false;
  });

  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeft, setDragStartLeft] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  
  const timelineRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("Auth persistence error:", err);
    });
    
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const nowInterval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(nowInterval);
  }, []);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  const loadEvents = async () => {
    if (!user || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const activeQ = query(
        collection(db, "events"),
        where("spaceId", "==", spaceId),
        where("deleted", "==", false)
      );

      const deletedQ = query(
        collection(db, "events"),
        where("spaceId", "==", spaceId),
        where("deleted", "==", true)
      );

      const [activeSnap, deletedSnap] = await Promise.all([
        getDocs(activeQ),
        getDocs(deletedQ),
      ]);

      setEvents(
        activeSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          start: d.data().startTime.toDate(),
          end: d.data().endTime.toDate(),
        }))
      );

      setDeletedEvents(
        deletedSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          start: d.data().startTime?.toDate(),
          end: d.data().endTime?.toDate(),
        }))
      );
    } catch (err) {
      console.error("Error loading events:", err);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user, spaceId]);

  useEffect(() => {
    localStorage.setItem('weekStartsOnMonday', JSON.stringify(weekStartsOnMonday));
  }, [weekStartsOnMonday]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.style.background = "#0F172A";
    } else {
      document.body.style.background = "#f8fafc";
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('use24HourFormat', JSON.stringify(use24HourFormat));
  }, [use24HourFormat]);

  const createFamilySpace = async () => {
    try {
      const ref = await addDoc(collection(db, "spaces"), {
        name: "Family",
        ownerId: user.uid,
        members: [user.uid],
        type: "shared",
        createdAt: serverTimestamp(),
      });
      setFamilySpaceId(ref.id);
      setSpaceId(ref.id);
    } catch (err) {
      console.error("Error creating family space:", err);
      setError("Failed to create family space");
    }
  };

  const addCategory = () => {
    const newCategory = {
      id: Date.now().toString(),
      name: "New Tag",
      color: "blue"
    };
    setCategories([...categories, newCategory]);
  };
  
  const updateCategory = (id, name, color) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, name, color } : cat
    ));
  };
  
  const deleteCategory = async (categoryId) => {
    if (!window.confirm("Delete this tag? Events will keep their current color.")) return;
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };
  
  const reorderCategories = (fromIndex, toIndex) => {
    const newCategories = [...categories];
    const [removed] = newCategories.splice(fromIndex, 1);
    newCategories.splice(toIndex, 0, removed);
    setCategories(newCategories);
  };

  const openNewEvent = (presetStart = null, presetEnd = null) => {
    setEditingEvent(null);
    setTitle("");
    setEventCategory("Work");
    
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
    setStartTime(ev.start.toISOString().slice(0, 16));
    setEndTime(ev.end.toISOString().slice(0, 16));
    setEventCategory(ev.category || "Work");
    setShowModal(true);
  };

  const duplicateEvent = async (ev) => {
    try {
      const newStart = new Date(ev.start);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(ev.end);
      newEnd.setDate(newEnd.getDate() + 1);

      const category = ev.category || "Work";
      const categoryColor = categories.find(c => c.name === category)?.color || "blue";

      await addDoc(collection(db, "events"), {
        spaceId,
        title: ev.title + " (Copy)",
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        color: categoryColor,
        category: category,
        deleted: false,
        createdAt: serverTimestamp(),
      });
      await loadEvents();
    } catch (err) {
      console.error("Error duplicating event:", err);
      setError("Failed to duplicate event");
    }
  };

  const saveEvent = async () => {
    if (!title || !startTime || !endTime) {
      setError("Please fill in all fields");
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      setError("End time must be after start time");
      return;
    }

    const categoryColor = categories.find(c => c.name === eventCategory)?.color || "blue";

    try {
      setLoading(true);
      setError(null);

      if (editingEvent) {
        await updateDoc(doc(db, "events", editingEvent.id), {
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
          color: categoryColor,
          category: eventCategory,
        });
      } else {
        await addDoc(collection(db, "events"), {
          spaceId,
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
          color: categoryColor,
          category: eventCategory,
          deleted: false,
          createdAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      await loadEvents();
    } catch (err) {
      console.error("Error saving event:", err);
      setError("Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;
    if (!window.confirm("Delete this event?")) return;

    try {
      await updateDoc(doc(db, "events", editingEvent.id), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });

      setShowModal(false);
      await loadEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
      setError("Failed to delete event");
    }
  };

  const restoreEvent = async ev => {
    try {
      await updateDoc(doc(db, "events", ev.id), { deleted: false });
      await loadEvents();
    } catch (err) {
      console.error("Error restoring event:", err);
      setError("Failed to restore event");
    }
  };

  const formatTime = d => {
    return d.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: !use24HourFormat 
    });
  };

  const today = currentDate;
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const toLeft = d => ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;

  const handleTimelineClick = (e) => {
    if (draggingEvent || resizingEvent || hasDragged) return;
    
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

  const handleEventClick = (e, ev) => {
    if (hasDragged) {
      setHasDragged(false);
      return;
    }
    e.stopPropagation();
    openEditEvent(ev);
  };

  const handleResizeStart = (e, ev, handle) => {
    e.stopPropagation();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    setResizingEvent(ev);
    setResizeHandle(handle);
    setDragStartX(clientX);
    
    const eventLeft = toLeft(ev.start);
    const eventWidth = toLeft(ev.end) - toLeft(ev.start);
    
    setDragStartLeft(eventLeft);
    setDragStartWidth(eventWidth);
    setHasDragged(false);
  };

  const handleResizeMove = (e) => {
    if (!resizingEvent) return;
    
    e.preventDefault();
    setHasDragged(true);
    
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX;
    
    const eventElement = document.querySelector(`[data-event-id="${resizingEvent.id}"]`);
    if (!eventElement) return;
    
    if (resizeHandle === 'left') {
      const newLeft = Math.round((dragStartLeft + deltaX) / (SNAP_MINUTES * PIXELS_PER_MINUTE)) * (SNAP_MINUTES * PIXELS_PER_MINUTE);
      const newWidth = dragStartLeft + dragStartWidth - newLeft;
      
      if (newWidth >= MIN_EVENT_DURATION * PIXELS_PER_MINUTE && newLeft >= 0) {
        eventElement.style.left = `${newLeft}px`;
        eventElement.style.width = `${newWidth}px`;
      }
    } else {
      const newWidth = Math.round((dragStartWidth + deltaX) / (SNAP_MINUTES * PIXELS_PER_MINUTE)) * (SNAP_MINUTES * PIXELS_PER_MINUTE);
      
      if (newWidth >= MIN_EVENT_DURATION * PIXELS_PER_MINUTE && dragStartLeft + newWidth <= DAY_WIDTH) {
        eventElement.style.width = `${newWidth}px`;
      }
    }
  };

  const handleResizeEnd = async (e) => {
    if (!resizingEvent) return;
    
    const eventElement = document.querySelector(`[data-event-id="${resizingEvent.id}"]`);
    if (!eventElement) return;
    
    const finalLeft = parseFloat(eventElement.style.left);
    const finalWidth = parseFloat(eventElement.style.width);
    
    const newStartMinutes = finalLeft / PIXELS_PER_MINUTE;
    const newEndMinutes = (finalLeft + finalWidth) / PIXELS_PER_MINUTE;
    
    const originalEventDate = new Date(resizingEvent.start);
    originalEventDate.setHours(0, 0, 0, 0);
    
    const newStart = new Date(originalEventDate.getTime() + newStartMinutes * 60000);
    const newEnd = new Date(originalEventDate.getTime() + newEndMinutes * 60000);
    
    const currentScrollPosition = timelineRef.current?.scrollLeft;
    isSavingRef.current = true;
    
    try {
      await updateDoc(doc(db, "events", resizingEvent.id), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      });
      
      await loadEvents();
      
      setTimeout(() => {
        if (timelineRef.current && currentScrollPosition !== null) {
          timelineRef.current.scrollLeft = currentScrollPosition;
        }
        isSavingRef.current = false;
        setHasDragged(false);
      }, 50);
      
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to resize event");
      await loadEvents();
      isSavingRef.current = false;
      setHasDragged(false);
    }
    
    setResizingEvent(null);
    setResizeHandle(null);
  };

  const handleDragStart = (e, ev) => {
    e.stopPropagation();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    setDraggingEvent(ev);
    setDragStartX(clientX);
    
    const eventLeft = toLeft(ev.start);
    const eventWidth = toLeft(ev.end) - toLeft(ev.start);
    
    setDragStartLeft(eventLeft);
    setDragStartWidth(eventWidth);
    setHasDragged(false);
  };

  const handleDragMove = (e) => {
    if (!draggingEvent) return;
    
    e.preventDefault();
    setHasDragged(true);
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX;
    
    const newLeft = Math.round((dragStartLeft + deltaX) / (SNAP_MINUTES * PIXELS_PER_MINUTE)) * (SNAP_MINUTES * PIXELS_PER_MINUTE);
    const clampedLeft = Math.max(0, Math.min(newLeft, DAY_WIDTH - dragStartWidth));
    
    const eventElement = document.querySelector(`[data-event-id="${draggingEvent.id}"]`);
    if (eventElement) {
      eventElement.style.left = `${clampedLeft}px`;
    }
  };

  const handleDragEnd = async (e) => {
    if (!draggingEvent) return;
    
    const eventElement = document.querySelector(`[data-event-id="${draggingEvent.id}"]`);
    if (!eventElement) return;
    
    const finalLeft = parseFloat(eventElement.style.left);
    
    const newStartMinutes = finalLeft / PIXELS_PER_MINUTE;
    const durationMinutes = dragStartWidth / PIXELS_PER_MINUTE;
    
    const originalEventDate = new Date(draggingEvent.start);
    originalEventDate.setHours(0, 0, 0, 0);
    
    const newStart = new Date(originalEventDate.getTime() + newStartMinutes * 60000);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    
    const currentScrollPosition = timelineRef.current?.scrollLeft;
    isSavingRef.current = true;
    
    try {
      await updateDoc(doc(db, "events", draggingEvent.id), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      });
      
      await loadEvents();
      
      setTimeout(() => {
        if (timelineRef.current && currentScrollPosition !== null) {
          timelineRef.current.scrollLeft = currentScrollPosition;
        }
        isSavingRef.current = false;
        setHasDragged(false);
      }, 50);
      
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to move event");
      await loadEvents();
      isSavingRef.current = false;
      setHasDragged(false);
    }
    
    setDraggingEvent(null);
  };

  useEffect(() => {
    if (draggingEvent || resizingEvent) {
      const handleMove = (e) => {
        if (draggingEvent) handleDragMove(e);
        if (resizingEvent) handleResizeMove(e);
      };
      const handleEnd = (e) => {
        if (draggingEvent) handleDragEnd(e);
        if (resizingEvent) handleResizeEnd(e);
      };
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [draggingEvent, resizingEvent]);

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToDate = (date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const getWeekDays = (date) => {
    const days = [];
    const current = new Date(date);
    let dayOfWeek = current.getDay();
    
    if (weekStartsOnMonday) {
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }
    
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const weekday = today.toLocaleDateString(undefined, { weekday: "long" });
  const dayDate = today.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const monthYear = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const nowLeft = toLeft(now);
  const isToday = today.toDateString() === now.toDateString();

  const weekDays = getWeekDays(currentDate);
  
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

  const userName = user?.displayName?.split(' ')[0] || 'there';

  if (!user) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{ 
          textAlign: "center", 
          background: "#fff", 
          padding: "60px 40px", 
          borderRadius: 20, 
          boxShadow: "0 30px 90px rgba(0,0,0,0.3)",
          maxWidth: 420
        }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 24 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#667eea" strokeWidth="2"/>
            <line x1="3" y1="9" x2="21" y2="9" stroke="#667eea" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1 style={{ 
            margin: "0 0 12px 0", 
            fontSize: 36, 
            fontWeight: 800, 
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-1px"
          }}>
            Timeline
          </h1>
          <p style={{ color: "#64748b", marginBottom: 36, fontSize: 17, fontWeight: 500 }}>
            Plan your day. Track your progress.
          </p>
          <button 
            onClick={() => signInWithPopup(auth, provider)}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 32px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh",
      background: darkMode 
        ? "#0F172A" 
        : "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: "24px",
    }}>
      <style>{`
        .timeline-scroll {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        .timeline-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .timeline-scroll::-webkit-scrollbar-track {
          background: ${darkMode ? '#1e293b' : '#f1f5f9'};
        }
        .timeline-scroll::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#475569' : '#cbd5e1'};
          border-radius: 4px;
        }
        .timeline-scroll::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#64748b' : '#94a3b8'};
        }
        .event-card {
          touch-action: none;
          cursor: grab;
        }
        .event-card:active {
          cursor: grabbing;
        }
        .resize-handle {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: ew-resize;
          z-index: 10;
        }
        .resize-handle-left {
          left: 0;
        }
        .resize-handle-right {
          right: 0;
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: darkMode ? "rgba(15, 23, 42, 0.95)" : "#fff",
        backdropFilter: "blur(10px)",
        borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
        padding: "16px 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            
            {/* Logo + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#667eea" strokeWidth="2"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="#667eea" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h1 style={{ 
                margin: 0, 
                fontSize: 24, 
                fontWeight: 800,
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Timeline
              </h1>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => openNewEvent()}
                style={{
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                Create Event
              </button>

              <button
                onClick={() => setShowCategoryManager(true)}
                style={{
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: darkMode ? "#f1f5f9" : "#0f172a"
                }}
              >
                Manage Tags
              </button>

              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 14,
                  cursor: "pointer",
                  color: darkMode ? "#94a3b8" : "#64748b"
                }}
              >
                Settings
              </button>
              
              <button
                onClick={() => signOut(auth)}
                style={{
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: darkMode ? "#f1f5f9" : "#0f172a"
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD - Welcome + Quote */}
      <div style={{
        maxWidth: showSidebar ? 1080 : 1400,
        margin: "24px auto",
        padding: "0 24px"
      }}>
        <div style={{
          background: darkMode ? "#1e293b" : "#fff",
          borderRadius: 16,
          padding: "32px",
          marginBottom: 24,
          boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
          border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0"
        }}>
          <h2 style={{
            margin: "0 0 8px 0",
            fontSize: 28,
            fontWeight: 700,
            color: darkMode ? "#f1f5f9" : "#0f172a"
          }}>
            Welcome back, {userName}!
          </h2>
          <p style={{
            margin: 0,
            fontSize: 16,
            color: darkMode ? "#94a3b8" : "#64748b",
            fontStyle: "italic"
          }}>
            "{getMotivationalQuote()}"
          </p>
        </div>

        {/* View Controls */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 16
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setViewMode("day")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: viewMode === "day" 
                  ? "linear-gradient(135deg, #667eea, #764ba2)" 
                  : (darkMode ? "#1e293b" : "#f8fafc"),
                color: viewMode === "day" ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"),
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Day
            </button>

            <button
              onClick={() => setViewMode("week")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: viewMode === "week" 
                  ? "linear-gradient(135deg, #667eea, #764ba2)" 
                  : (darkMode ? "#1e293b" : "#f8fafc"),
                color: viewMode === "week" ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"),
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Week
            </button>
            
            <button
              onClick={() => setViewMode("year")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: viewMode === "year" 
                  ? "linear-gradient(135deg, #667eea, #764ba2)" 
                  : (darkMode ? "#1e293b" : "#f8fafc"),
                color: viewMode === "year" ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"),
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Year
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button 
              onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousDay} 
              style={{ 
                background: darkMode ? "#1e293b" : "#f8fafc",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 16,
                color: darkMode ? "#f1f5f9" : "#0f172a"
              }}
            >
              ←
            </button>
            
            <button 
              onClick={goToToday}
              style={{ 
                background: darkMode ? "#1e293b" : "#f8fafc",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: darkMode ? "#f1f5f9" : "#0f172a"
              }}
            >
              Today
            </button>

            <button 
              onClick={viewMode === "week" ? goToNextWeek : goToNextDay} 
              style={{ 
                background: darkMode ? "#1e293b" : "#f8fafc",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 16,
                color: darkMode ? "#f1f5f9" : "#0f172a"
              }}
            >
              →
            </button>

            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: darkMode ? "#94a3b8" : "#64748b",
              marginLeft: 8
            }}>
              {viewMode === "week" 
                ? `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : weekday + ", " + dayDate
              }
            </div>
          </div>
        </div>

        {/* Tags Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterCategory("All")}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: filterCategory === "All" 
                ? (darkMode ? "#334155" : "#e2e8f0") 
                : "transparent",
              color: darkMode ? "#f1f5f9" : "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            All
          </button>
          
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.name)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: filterCategory === cat.name 
                  ? (darkMode ? "#334155" : "#e2e8f0") 
                  : "transparent",
                color: darkMode ? "#f1f5f9" : "#0f172a",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: EVENT_COLORS[cat.color].dot
              }} />
              {cat.name}
            </button>
          ))}
        </div>

        {/* Timeline or Week View */}
        {loading ? (
          <div style={{
            padding: 80,
            textAlign: "center",
            color: darkMode ? "#94a3b8" : "#64748b",
            fontSize: 15
          }}>
            Loading...
          </div>
        ) : viewMode === "day" ? (
          <div style={{ 
            background: darkMode ? "#1e293b" : "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0"
          }}>
            <div ref={timelineRef} className="timeline-scroll" style={{ overflowX: "auto" }} onClick={handleTimelineClick}>
              <div style={{ position: "relative", width: DAY_WIDTH, minHeight: 400, padding: "20px 0" }}>

                {/* Hour Grid Lines */}
                {[...Array(24)].map((_, h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      left: h * 60 * PIXELS_PER_MINUTE,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: darkMode ? "#334155" : "#e2e8f0",
                      zIndex: 1
                    }}
                  />
                ))}

                {/* Hour Labels */}
                {[...Array(24)].map((_, h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      left: h * 60 * PIXELS_PER_MINUTE + 8,
                      top: 8,
                      fontSize: 12,
                      color: darkMode ? "#64748b" : "#94a3b8",
                      fontWeight: 600,
                      pointerEvents: "none",
                      zIndex: 2
                    }}
                  >
                    {use24HourFormat 
                      ? String(h).padStart(2, "0") + ":00"
                      : h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`
                    }
                  </div>
                ))}

                {/* Current Time Indicator */}
                {isToday && (
                  <div style={{
                    position: "absolute",
                    left: nowLeft,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "#667eea",
                    zIndex: 10,
                    boxShadow: "0 0 8px rgba(102, 126, 234, 0.5)",
                    pointerEvents: "none"
                  }} />
                )}

                {/* Empty State */}
                {stacked.length === 0 && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    color: darkMode ? "#64748b" : "#94a3b8",
                    fontSize: 15,
                    pointerEvents: "none"
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <div style={{ fontWeight: 600 }}>No events today</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Click anywhere to create</div>
                  </div>
                )}

                {/* Events */}
                {stacked.map(ev => {
                  const width = toLeft(ev.end) - toLeft(ev.start);
                  const isSmall = width < 150;
                  const isDragging = draggingEvent?.id === ev.id;
                  const isResizing = resizingEvent?.id === ev.id;
                  const colorStyle = EVENT_COLORS[ev.color || "blue"];
                  
                  return (
                    <div
                      key={ev.id}
                      data-event-id={ev.id}
                      className="event-card"
                      onMouseDown={(e) => {
                        if (!e.target.classList.contains('resize-handle')) {
                          handleDragStart(e, ev);
                        }
                      }}
                      onClick={(e) => handleEventClick(e, ev)}
                      style={{
                        position: "absolute",
                        left: toLeft(ev.start),
                        top: 50 + ev.row * (EVENT_HEIGHT + ROW_GAP),
                        width,
                        height: EVENT_HEIGHT,
                        background: colorStyle.bg,
                        color: "#fff",
                        borderRadius: 8,
                        padding: "10px 12px",
                        boxShadow: (isDragging || isResizing)
                          ? "0 8px 24px rgba(102, 126, 234, 0.4)" 
                          : "0 2px 8px rgba(0,0,0,0.1)",
                        transition: (isDragging || isResizing) ? "none" : "box-shadow 0.2s",
                        overflow: "hidden",
                        opacity: (isDragging || isResizing) ? 0.8 : 1,
                        zIndex: (isDragging || isResizing) ? 100 : 5
                      }}
                    >
                      <div
                        className="resize-handle resize-handle-left"
                        onMouseDown={(e) => handleResizeStart(e, ev, 'left')}
                      />
                      
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: isSmall ? 12 : 14,
                        marginBottom: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        pointerEvents: "none"
                      }}>
                        {ev.title}
                      </div>
                      {!isSmall && (
                        <div style={{ fontSize: 11, opacity: 0.9, pointerEvents: "none" }}>
                          {formatTime(ev.start)} – {formatTime(ev.end)}
                        </div>
                      )}
                      
                      <div
                        className="resize-handle resize-handle-right"
                        onMouseDown={(e) => handleResizeStart(e, ev, 'right')}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === "week" ? (
          <div style={{ 
            background: darkMode ? "#1e293b" : "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0"
          }}>
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 1,
              background: darkMode ? "#334155" : "#e2e8f0",
              padding: 1
            }}>
              {weekDays.map((day, index) => {
                const dayEventsForWeek = filteredEvents.filter(ev => 
                  ev.start.toDateString() === day.toDateString()
                );
                const isDayToday = day.toDateString() === now.toDateString();
      
                return (
                  <div
                    key={index}
                    style={{
                      background: darkMode ? "#1e293b" : "#fff",
                      padding: "16px",
                      cursor: "pointer",
                      minHeight: 180
                    }}
                    onClick={() => goToDate(day)}
                  >
                    <div style={{ 
                      textAlign: "center", 
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: darkMode ? "1px solid #334155" : "1px solid #e2e8f0"
                    }}>
                      <div style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        color: darkMode ? "#64748b" : "#94a3b8",
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div style={{ 
                        fontSize: 24, 
                        fontWeight: 700,
                        color: isDayToday ? "#667eea" : (darkMode ? "#f1f5f9" : "#0f172a")
                      }}>
                        {day.getDate()}
                      </div>
                    </div>
      
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dayEventsForWeek.length === 0 ? (
                        <div style={{ 
                          textAlign: "center", 
                          color: darkMode ? "#64748b" : "#cbd5e1", 
                          fontSize: 11,
                          padding: "16px 0"
                        }}>
                          No events
                        </div>
                      ) : (
                        dayEventsForWeek.slice(0, 3).map(ev => {
                          const colorStyle = EVENT_COLORS[ev.color || "blue"];
                          return (
                            <div
                              key={ev.id}
                              style={{
                                background: colorStyle.bg,
                                color: "#fff",
                                padding: "6px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEvent(ev);
                              }}
                            >
                              {ev.title}
                            </div>
                          );
                        })
                      )}
                      {dayEventsForWeek.length > 3 && (
                        <div style={{ 
                          fontSize: 10, 
                          color: darkMode ? "#94a3b8" : "#64748b", 
                          textAlign: "center"
                        }}>
                          +{dayEventsForWeek.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>Year view coming soon</div>
        )}
      </div>

      {/* SIDEBAR */}
      {showSidebar && (
        <div style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 360,
          background: darkMode ? "#1e293b" : "#fff",
          borderLeft: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
          boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.1)",
          overflowY: "auto",
          padding: "80px 20px 20px 20px",
          zIndex: 90
        }}>
          <button
            onClick={() => setShowSidebar(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: darkMode ? "#94a3b8" : "#64748b"
            }}
          >
            ✕
          </button>

          <h3 style={{
            margin: "0 0 16px 0",
            fontSize: 18,
            fontWeight: 700,
            color: darkMode ? "#f1f5f9" : "#0f172a"
          }}>
            Upcoming Events
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const nextWeek = new Date(today);
              nextWeek.setDate(nextWeek.getDate() + 7);
              
              const upcomingEvents = filteredEvents
                .filter(ev => ev.start >= today && ev.start < nextWeek)
                .sort((a, b) => a.start - b.start)
                .slice(0, 10);
              
              if (upcomingEvents.length === 0) {
                return (
                  <div style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: darkMode ? "#64748b" : "#94a3b8",
                    fontSize: 13
                  }}>
                    No upcoming events
                  </div>
                );
              }
              
              return upcomingEvents.map((ev, idx) => {
                const colorStyle = EVENT_COLORS[ev.color || "blue"];
                const isToday = ev.start.toDateString() === today.toDateString();
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      goToDate(ev.start);
                      openEditEvent(ev);
                    }}
                    style={{
                      padding: "12px",
                      borderRadius: 8,
                      background: darkMode ? "#0f172a" : "#f8fafc",
                      border: `2px solid ${colorStyle.border}`,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateX(-4px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
                  >
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: darkMode ? "#f1f5f9" : "#0f172a",
                      marginBottom: 4
                    }}>
                      {ev.title}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: darkMode ? "#64748b" : "#94a3b8"
                    }}>
                      {isToday ? "Today" : ev.start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
      
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            border: "none",
            borderRadius: "8px 0 0 8px",
            padding: "16px 8px",
            cursor: "pointer",
            color: "#fff",
            fontSize: 16,
            zIndex: 90
          }}
        >
          ☰
        </button>
      )}

      {/* MODALS */}
      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)} darkMode={darkMode}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div>
              <div style={{ 
                fontWeight: 600, 
                fontSize: 14, 
                color: darkMode ? "#f1f5f9" : "#0f172a", 
                marginBottom: 12
              }}>
                Theme
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDarkMode(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: !darkMode ? "2px solid #667eea" : "1px solid #e2e8f0",
                    background: !darkMode ? "#eef2ff" : "#fff",
                    color: !darkMode ? "#667eea" : "#64748b",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Light
                </button>
                <button
                  onClick={() => setDarkMode(true)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: darkMode ? "2px solid #667eea" : "1px solid #334155",
                    background: darkMode ? "#1e293b" : "#1a1a1a",
                    color: darkMode ? "#667eea" : "#94a3b8",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Dark
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 12 }}>
                Time Format
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setUse24HourFormat(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: !use24HourFormat ? "2px solid #667eea" : "1px solid #e2e8f0",
                    background: !use24HourFormat ? "#eef2ff" : (darkMode ? "#1e293b" : "#fff"),
                    color: !use24HourFormat ? "#667eea" : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  12-hour
                </button>
                <button
                  onClick={() => setUse24HourFormat(true)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: use24HourFormat ? "2px solid #667eea" : "1px solid #e2e8f0",
                    background: use24HourFormat ? "#eef2ff" : (darkMode ? "#1e293b" : "#fff"),
                    color: use24HourFormat ? "#667eea" : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  24-hour
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 12 }}>
                Week Starts On
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setWeekStartsOnMonday(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: !weekStartsOnMonday ? "2px solid #667eea" : "1px solid #e2e8f0",
                    background: !weekStartsOnMonday ? "#eef2ff" : (darkMode ? "#1e293b" : "#fff"),
                    color: !weekStartsOnMonday ? "#667eea" : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Sunday
                </button>
                <button
                  onClick={() => setWeekStartsOnMonday(true)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: weekStartsOnMonday ? "2px solid #667eea" : "1px solid #e2e8f0",
                    background: weekStartsOnMonday ? "#eef2ff" : (darkMode ? "#1e293b" : "#fff"),
                    color: weekStartsOnMonday ? "#667eea" : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Monday
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showCategoryManager && (
        <Modal title="Manage Tags" onClose={() => setShowCategoryManager(false)} darkMode={darkMode}>
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={addCategory}
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%"
              }}
            >
              Add New Tag
            </button>
          </div>
          
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => setEditingCategoryId(cat.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (editingCategoryId && editingCategoryId !== cat.id) {
                  const fromIndex = categories.findIndex(c => c.id === editingCategoryId);
                  reorderCategories(fromIndex, index);
                  setEditingCategoryId(null);
                }
              }}
              style={{
                padding: "12px",
                marginBottom: 8,
                borderRadius: 8,
                background: darkMode ? "#0f172a" : "#f8fafc",
                border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                cursor: "move"
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => updateCategory(cat.id, e.target.value, cat.color)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    fontSize: 14,
                    background: darkMode ? "#1e293b" : "#fff",
                    color: darkMode ? "#f1f5f9" : "#0f172a"
                  }}
                />
                
                <select
                  value={cat.color}
                  onChange={(e) => updateCategory(cat.id, cat.name, e.target.value)}
                  style={{
                    padding: "8px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    fontSize: 14,
                    background: darkMode ? "#1e293b" : "#fff",
                    color: darkMode ? "#f1f5f9" : "#0f172a"
                  }}
                >
                  {Object.keys(EVENT_COLORS).map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => deleteCategory(cat.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {showModal && (
        <Modal 
          title={editingEvent ? "Edit Event" : "New Event"} 
          onClose={() => setShowModal(false)} 
          darkMode={darkMode}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8 }}>
                Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Event title"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  fontSize: 14,
                  background: darkMode ? "#1e293b" : "#fff",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8 }}>
                Category
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setEventCategory(cat.name)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 6,
                      border: eventCategory === cat.name ? "2px solid #667eea" : "1px solid #e2e8f0",
                      background: eventCategory === cat.name ? "#eef2ff" : (darkMode ? "#1e293b" : "#fff"),
                      color: eventCategory === cat.name ? "#667eea" : (darkMode ? "#94a3b8" : "#64748b"),
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: EVENT_COLORS[cat.color].dot
                    }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8 }}>
                  Start
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                    fontSize: 14,
                    background: darkMode ? "#1e293b" : "#fff",
                    color: darkMode ? "#f1f5f9" : "#0f172a",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8 }}>
                  End
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                    fontSize: 14,
                    background: darkMode ? "#1e293b" : "#fff",
                    color: darkMode ? "#f1f5f9" : "#0f172a",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                color: "#991b1b",
                fontSize: 13
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveEvent}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14
                }}
              >
                {loading ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: darkMode ? "#f1f5f9" : "#64748b"
                }}
              >
                Cancel
              </button>
            </div>

            {editingEvent && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    duplicateEvent(editingEvent);
                    setShowModal(false);
                  }}
                  style={{
                    flex: 1,
                    background: darkMode ? "#1e293b" : "#f0f9ff",
                    border: darkMode ? "1px solid #334155" : "1px solid #bae6fd",
                    borderRadius: 8,
                    padding: "12px",
                    cursor: "pointer",
                    color: darkMode ? "#06B6D4" : "#0369a1",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Duplicate
                </button>
                
                <button
                  onClick={deleteEvent}
                  style={{
                    flex: 1,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "12px",
                    cursor: "pointer",
                    color: "#dc2626",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, darkMode }) {
  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 20
      }} 
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          background: darkMode ? "#1e293b" : "#fff",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
        }}
      >
        <div style={{
          padding: "20px 24px",
          borderBottom: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
              color: darkMode ? "#94a3b8" : "#64748b",
              padding: 4
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "calc(90vh - 80px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
