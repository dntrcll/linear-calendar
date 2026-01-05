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

// ZOOM LEVELS FOR TIMELINE
const ZOOM_LEVELS = {
  COMPACT: 1,    // See full 24 hours (60px per hour)
  NORMAL: 2,     // Default view (120px per hour) 
  DETAILED: 4    // Zoomed in (240px per hour)
};

const EVENT_HEIGHT = 48;
const ROW_GAP = 8;
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

// MODERN BLUE-CYAN THEME
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
  { id: "personal", name: "Personal", color: "teal" },
  { id: "meeting", name: "Meeting", color: "purple" },
  { id: "deadline", name: "Deadline", color: "red" },
];

// LOGO COMPONENT
function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#gradient)" />
      <path d="M8 12h16M8 16h12M8 20h16M16 8v16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="2" fill="white"/>
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#06B6D4"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("Work");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  const [viewMode, setViewMode] = useState("day");
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVELS.COMPACT);
  
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [use24HourFormat, setUse24HourFormat] = useState(() => {
    const saved = localStorage.getItem('use24HourFormat');
    return saved ? JSON.parse(saved) : true; // Default to 24-hour
  });

  const [sidebarNotes, setSidebarNotes] = useState(() => {
    const saved = localStorage.getItem('sidebarNotes');
    return saved || '';
  });

  const [draggingEvent, setDraggingEvent] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  
  const timelineRef = useRef(null);

  // Calculate pixels per minute based on zoom level
  const PIXELS_PER_MINUTE = zoomLevel * 1; // 1, 2, or 4
  const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;

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
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.style.background = darkMode ? "#0F172A" : "#f8fafc";
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('use24HourFormat', JSON.stringify(use24HourFormat));
  }, [use24HourFormat]);

  useEffect(() => {
    localStorage.setItem('sidebarNotes', sidebarNotes);
  }, [sidebarNotes]);

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
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24HourFormat
    };
    return d.toLocaleTimeString([], options);
  };

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

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = currentDate;
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const toLeft = d => ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;

  const dayDate = today.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const isToday = today.toDateString() === now.toDateString();
  const nowLeft = toLeft(now);
  
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

  if (!user) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
      }}>
        <div style={{ 
          textAlign: "center", 
          background: "rgba(255,255,255,0.98)", 
          padding: "40px 32px", 
          borderRadius: 20, 
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 380
        }}>
          <Logo />
          <h1 style={{ 
            margin: "16px 0 8px 0", 
            fontSize: 28, 
            fontWeight: 800, 
            background: "linear-gradient(135deg, #3B82F6, #06B6D4)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent" 
          }}>
            Timeline
          </h1>
          <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
            Your life, organized
          </p>
          <button 
            onClick={() => signInWithPopup(auth, provider)}
            style={{
              background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
              transition: "transform 0.2s"
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
      background: darkMode ? "#0F172A" : "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      paddingBottom: "20px"
    }}>
      <style>
{`
* {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

input, button, textarea {
  user-select: text;
}

.timeline-scroll {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: ${darkMode ? '#334155 #1e293b' : '#cbd5e1 #f1f5f9'};
}

.timeline-scroll::-webkit-scrollbar {
  height: 8px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: ${darkMode ? '#1e293b' : '#f1f5f9'};
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: ${darkMode ? '#334155' : '#cbd5e1'};
  border-radius: 4px;
}
`}
</style>

      {/* COMPACT HEADER */}
      <div style={{
        background: darkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
        padding: "12px 20px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: darkMode ? "0 4px 24px rgba(0, 0, 0, 0.4)" : "0 2px 8px rgba(0,0,0,0.05)"
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          
          {/* Left: Logo + Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Logo />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                {dayDate}
              </div>
              <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#94a3b8" }}>
                Hi, {user.displayName.split(' ')[0]}
              </div>
            </div>
          </div>

          {/* Center: Navigation */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={goToPreviousDay} style={navButtonStyle(darkMode)}>←</button>
            <button onClick={goToToday} disabled={isToday} style={{...navButtonStyle(darkMode), opacity: isToday ? 0.5 : 1, cursor: isToday ? 'not-allowed' : 'pointer'}}>
              Today
            </button>
            <button onClick={goToNextDay} style={navButtonStyle(darkMode)}>→</button>
          </div>

          {/* Right: Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Zoom Controls */}
            <div style={{ display: "flex", gap: 4, padding: "4px", background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc", borderRadius: 8 }}>
              <button 
                onClick={() => setZoomLevel(ZOOM_LEVELS.COMPACT)}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: zoomLevel === ZOOM_LEVELS.COMPACT ? "linear-gradient(135deg, #3B82F6, #06B6D4)" : "transparent",
                  color: zoomLevel === ZOOM_LEVELS.COMPACT ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"),
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Fit
              </button>
              <button 
                onClick={() => setZoomLevel(ZOOM_LEVELS.NORMAL)}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: zoomLevel === ZOOM_LEVELS.NORMAL ? "linear-gradient(135deg, #3B82F6, #06B6D4)" : "transparent",
                  color: zoomLevel === ZOOM_LEVELS.NORMAL ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"),
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Normal
              </button>
              <button 
                onClick={() => setZoomLevel(ZOOM_LEVELS.DETAILED)}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: zoomLevel === ZOOM_LEVELS.DETAILED ? "linear-gradient(135deg, #3B82F6, #06B6D4)" : "transparent",
                  color: zoomLevel === ZOOM_LEVELS.DETAILED ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"),
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Detail
              </button>
            </div>

            <button onClick={() => openNewEvent()} style={actionButtonStyle}>+ Event</button>
            <button onClick={() => setShowSidebar(true)} style={iconButtonStyle(darkMode)}>☰</button>
            <button onClick={() => setShowSettings(true)} style={iconButtonStyle(darkMode)}>⚙️</button>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div style={{ maxWidth: 1400, margin: "20px auto", padding: "0 20px" }}>
        <div style={{ 
          background: darkMode ? "rgba(30, 41, 59, 0.4)" : "#fff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.08)",
          border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0"
        }}>
          <div ref={timelineRef} className="timeline-scroll" style={{ overflowX: "auto", overflowY: "hidden" }}>
            <div style={{ position: "relative", width: DAY_WIDTH, minHeight: 300, padding: "16px 0" }}>

              {/* Hour markers */}
              {[...Array(24)].map((_, h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: h * 60 * PIXELS_PER_MINUTE,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: darkMode ? "rgba(148, 163, 184, 0.1)" : "#e2e8f0",
                    zIndex: 1
                  }}
                />
              ))}

              {/* Hour labels */}
              {[...Array(24)].map((_, h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: h * 60 * PIXELS_PER_MINUTE + 8,
                    top: 8,
                    fontSize: 11,
                    color: darkMode ? "#64748b" : "#94a3b8",
                    fontWeight: 600,
                    background: darkMode ? "rgba(15, 23, 42, 0.8)" : "rgba(255,255,255,0.8)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    pointerEvents: "none",
                    zIndex: 2
                  }}
                >
                  {use24HourFormat ? String(h).padStart(2, "0") : (h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h-12}PM`)}
                </div>
              ))}

              {/* Current time indicator */}
              {isToday && (
                <div style={{
                  position: "absolute",
                  left: nowLeft,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "linear-gradient(180deg, #3B82F6, #06B6D4)",
                  zIndex: 10,
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
                  pointerEvents: "none"
                }} />
              )}

              {/* Events */}
              {stacked.map(ev => {
                const width = toLeft(ev.end) - toLeft(ev.start);
                const colorStyle = EVENT_COLORS[ev.color || "blue"];
                
                return (
                  <div
                    key={ev.id}
                    onClick={() => openEditEvent(ev)}
                    style={{
                      position: "absolute",
                      left: toLeft(ev.start),
                      top: 50 + ev.row * (EVENT_HEIGHT + ROW_GAP),
                      width,
                      height: EVENT_HEIGHT,
                      background: colorStyle.bg,
                      color: "#fff",
                      borderRadius: 8,
                      padding: "8px 12px",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      overflow: "hidden",
                      zIndex: 5,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
                    }}
                  >
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.title}
                    </div>
                    {width > 100 && (
                      <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                        {formatTime(ev.start)}
                      </div>
                    )}
                  </div>
                );
              })}

              {stacked.length === 0 && (
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  color: darkMode ? "#64748b" : "#94a3b8",
                  fontSize: 14,
                  pointerEvents: "none"
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div>No events today</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING SIDEBAR OVERLAY */}
      {showSidebar && (
        <>
          <div 
            onClick={() => setShowSidebar(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 100
            }}
          />
          <div style={{
            position: "fixed",
            right: 20,
            top: 80,
            bottom: 20,
            width: 340,
            background: darkMode ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(16px)",
            borderRadius: 16,
            boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.6)" : "0 20px 60px rgba(0,0,0,0.2)",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
            zIndex: 101,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            {/* Sidebar Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                Quick Access
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  color: darkMode ? "#94a3b8" : "#64748b",
                  cursor: "pointer",
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>

            {/* Upcoming Events */}
            <div style={{ padding: "16px 20px", borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 12 }}>
                UPCOMING
              </div>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                
                const upcomingEvents = filteredEvents
                  .filter(ev => ev.start >= today && ev.start < nextWeek)
                  .sort((a, b) => a.start - b.start)
                  .slice(0, 5);
                
                if (upcomingEvents.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "20px 0", color: darkMode ? "#64748b" : "#94a3b8", fontSize: 13 }}>
                      No upcoming events
                    </div>
                  );
                }
                
                return upcomingEvents.map((ev, idx) => {
                  const colorStyle = EVENT_COLORS[ev.color || "blue"];
                  return (
                    <div
                      key={idx}
                      onClick={() => openEditEvent(ev)}
                      style={{
                        padding: "10px 12px",
                        marginBottom: 8,
                        borderRadius: 8,
                        background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc",
                        borderLeft: `3px solid ${colorStyle.dot}`,
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(59, 130, 246, 0.2)" : "#eef2ff"}
                      onMouseLeave={e => e.currentTarget.style.background = darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc"}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 4 }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8" }}>
                        {ev.start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {formatTime(ev.start)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Notes */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 12 }}>
                NOTES
              </div>
              <textarea
                value={sidebarNotes}
                onChange={(e) => setSidebarNotes(e.target.value)}
                placeholder="Quick notes..."
                style={{
                  flex: 1,
                  padding: "12px",
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                  background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                  color: darkMode ? "#e2e8f0" : "#0f172a",
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none"
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)} darkMode={darkMode}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* Theme */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
                THEME
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDarkMode(false)}
                  style={settingButtonStyle(!darkMode, darkMode)}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setDarkMode(true)}
                  style={settingButtonStyle(darkMode, darkMode)}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            {/* Time Format */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
                TIME FORMAT
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setUse24HourFormat(false)}
                  style={settingButtonStyle(!use24HourFormat, darkMode)}
                >
                  12-hour
                </button>
                <button
                  onClick={() => setUse24HourFormat(true)}
                  style={settingButtonStyle(use24HourFormat, darkMode)}
                >
                  24-hour
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={() => signOut(auth)}
              style={{
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 20
              }}
            >
              Sign Out
            </button>
          </div>
        </Modal>
      )}

      {/* EVENT MODAL */}
      {showModal && (
        <Modal title={editingEvent ? "Edit Event" : "New Event"} onClose={() => setShowModal(false)} darkMode={darkMode}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              style={inputStyle(darkMode)}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setEventCategory(cat.name)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: eventCategory === cat.name ? "2px solid #3B82F6" : `1px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}`,
                    background: eventCategory === cat.name ? (darkMode ? "#1e3a8a" : "#eef2ff") : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
                    color: eventCategory === cat.name ? (darkMode ? "#fff" : "#4338ca") : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 12,
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
                    background: (EVENT_COLORS[cat.color] || EVENT_COLORS.blue).dot
                  }} />
                  {cat.name}
                </button>
              ))}
            </div>

            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEvent} disabled={loading} style={actionButtonStyle}>
                {loading ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowModal(false)} style={{...actionButtonStyle, background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc", color: darkMode ? "#f1f5f9" : "#64748b"}}>
                Cancel
              </button>
            </div>

            {editingEvent && (
              <button onClick={deleteEvent} style={{...actionButtonStyle, background: "#fee2e2", color: "#dc2626"}}>
                Delete Event
              </button>
            )}
          </div>
        </Modal>
      )}

      {error && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "12px 16px",
          background: "#fee2e2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          color: "#dc2626",
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 200
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// HELPER COMPONENTS & STYLES
function Modal({ title, onClose, children, darkMode }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: darkMode ? "rgba(30, 41, 59, 0.98)" : "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 440,
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "none"
      }}>
        <div style={{
          padding: "20px",
          borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: "transparent",
            border: "none",
            fontSize: 20,
            color: darkMode ? "#94a3b8" : "#64748b",
            cursor: "pointer",
            padding: 4
          }}>
            ✕
          </button>
        </div>
        <div style={{ padding: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const navButtonStyle = (darkMode) => ({
  padding: "8px 14px",
  borderRadius: 8,
  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
  background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc",
  color: darkMode ? "#f1f5f9" : "#0f172a",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s"
});

const iconButtonStyle = (darkMode) => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
  background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc",
  color: darkMode ? "#f1f5f9" : "#0f172a",
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s"
});

const actionButtonStyle = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "transform 0.2s",
  flex: 1
};

const inputStyle = (darkMode) => ({
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
  background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
  color: darkMode ? "#f1f5f9" : "#0f172a",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box"
});

const settingButtonStyle = (active, darkMode) => ({
  flex: 1,
  padding: "12px",
  borderRadius: 10,
  border: active ? "2px solid #3B82F6" : `1px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}`,
  background: active ? (darkMode ? "#1e3a8a" : "#eef2ff") : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
  color: active ? (darkMode ? "#fff" : "#4338ca") : (darkMode ? "#94a3b8" : "#64748b"),
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer"
});
