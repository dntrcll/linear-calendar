// ============================================================================
// TIMELINE OS — COMPLETE FIXED VERSION
// ============================================================================

import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback
} from "react";

import {
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "firebase/auth";

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
  Timestamp
} from "firebase/firestore";

import { auth, provider, db } from "./firebase";

// ============================================================================
// SYSTEM CONSTANTS
// ============================================================================

const LAYOUT = {
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 72,
  FOOTER_HEIGHT: 0,
  PIXELS_PER_MINUTE: 2.4,
  SNAP_MINUTES: 15,
  DAY_START_HOUR: 0,
  DAY_END_HOUR: 24,
  YEAR_COLS: 38
};

const THEMES = {
  dark: {
    id: "dark",
    bg: "#0B0E11",
    sidebar: "#111418",
    panel: "#181B21",
    card: "#1F2933",
    text: "#F5F5F4",
    textMuted: "#A8A29E",
    border: "#292524",
    accent: "#F43F5E",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444"
  },
  light: {
    id: "light",
    bg: "#FAFAF9",
    sidebar: "#F5F5F4",
    panel: "#FFFFFF",
    card: "#FFFFFF",
    text: "#1C1917",
    textMuted: "#78716C",
    border: "#E7E5E4",
    accent: "#D97706",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626"
  }
};

// ============================================================================
// UTILITY FUNCTIONS (ONCE)
// ============================================================================

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function snapMinutes(minutes) {
  return Math.round(minutes / LAYOUT.SNAP_MINUTES) * LAYOUT.SNAP_MINUTES;
}

function snapDateToGrid(date) {
  const mins = snapMinutes(minutesSinceMidnight(date));
  const d = new Date(date);
  d.setHours(0, mins, 0, 0);
  return d;
}

function getNowPosition() {
  const now = new Date();
  const minutes = minutesSinceMidnight(now);
  return minutes * LAYOUT.PIXELS_PER_MINUTE;
}

function toTimeInput(date) {
  return date.toTimeString().slice(0, 5);
}

function fromTimeInput(baseDate, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date, monday = true) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = monday
    ? day === 0
      ? -6
      : 1 - day
    : -day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(start, end) {
  return (
    start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) +
    " – " +
    end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  return { user, loading, login, logout };
}

// ============================================================================
// DATA STORE
// ============================================================================

function useEvents({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, "events"),
        where("uid", "==", user.uid),
        where("deleted", "==", false)
      );
      
      const snap = await getDocs(q);
      const loadedEvents = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          start: data.startTime?.toDate() || new Date(),
          end: data.endTime?.toDate() || new Date()
        };
      });
      
      setEvents(loadedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const saveEvent = async (payload) => {
    if (!user) return;

    try {
      const data = {
        uid: user.uid,
        title: payload.title,
        startTime: Timestamp.fromDate(payload.start),
        endTime: Timestamp.fromDate(payload.end),
        updatedAt: serverTimestamp(),
        deleted: false
      };

      if (payload.id && !payload.id.startsWith("local-")) {
        await updateDoc(doc(db, "events", payload.id), data);
      } else {
        await addDoc(collection(db, "events"), {
          ...data,
          createdAt: serverTimestamp()
        });
      }

      // Reload events
      await loadEvents();
      return true;
    } catch (error) {
      console.error("Error saving event:", error);
      return false;
    }
  };

  const deleteEvent = async (id) => {
    if (!user) return false;
    
    try {
      await updateDoc(doc(db, "events", id), {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      
      await loadEvents();
      return true;
    } catch (error) {
      console.error("Error deleting event:", error);
      return false;
    }
  };

  return { events, setEvents, loading, saveEvent, deleteEvent, reload: loadEvents };
}

// ============================================================================
// VIEW COMPONENTS
// ============================================================================

function DayView({ currentDate, events, now, onEditEvent, onCreateEvent }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = currentDate.toDateString() === now.toDateString();
  
  const dayEvents = useMemo(
    () => events.filter(e => e.start.toDateString() === currentDate.toDateString()),
    [events, currentDate]
  );

  return (
    <div style={{ padding: "40px 80px", maxWidth: 960, margin: "0 auto", position: "relative" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 13, letterSpacing: 2, opacity: 0.6, marginBottom: 8 }}>
          {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
        </div>
        <h1 style={{ fontSize: 48 }}>
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </h1>
      </div>

      {/* TIMELINE */}
      <div style={{ position: "relative", borderLeft: "1px solid var(--border)", paddingLeft: 48 }}>
        {isToday && (
          <div className="now-line" style={{ top: getNowPosition() }}>
            <div className="now-dot" />
          </div>
        )}

        {hours.map((h) => {
          const slotEvents = dayEvents.filter(e => e.start.getHours() === h);
          const isPast = isToday && h < now.getHours();

          return (
            <div key={h} style={{ minHeight: 96, position: "relative", marginBottom: 12 }}>
              {/* HOUR LABEL */}
              <div style={{
                position: "absolute",
                left: -80,
                top: 0,
                fontSize: 14,
                opacity: 0.5,
                width: 60,
                textAlign: "right"
              }}>
                {h}:00
              </div>

              {/* EVENTS */}
              {slotEvents.map((ev) => {
                const duration = Math.round((ev.end - ev.start) / 60000);
                return (
                  <div
                    key={ev.id}
                    className={isPast ? "past-event" : ""}
                    onClick={() => onEditEvent(ev)}
                    style={{
                      padding: 20,
                      background: "var(--card)",
                      borderRadius: 12,
                      marginBottom: 12,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {ev.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {ev.end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {duration}m
                    </div>
                  </div>
                );
              })}

              {/* EMPTY SLOT */}
              {slotEvents.length === 0 && (
                <div
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setHours(h, 0, 0, 0);
                    onCreateEvent(d);
                  }}
                  style={{ height: 64, cursor: "pointer" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, events, now, onEditEvent, onCreateEvent }) {
  const days = useMemo(() => {
    const base = new Date(currentDate);
    const day = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const HOUR_HEIGHT = 60 * LAYOUT.PIXELS_PER_MINUTE;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* TIME AXIS */}
      <div style={{ width: 72, borderRight: "1px solid var(--border)" }}>
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            style={{
              height: HOUR_HEIGHT,
              fontSize: 11,
              opacity: 0.5,
              paddingRight: 8,
              textAlign: "right"
            }}
          >
            {h}:00
          </div>
        ))}
      </div>

      {/* DAYS */}
      {days.map((dayDate, idx) => (
        <WeekDayColumn
          key={idx}
          date={dayDate}
          events={events}
          now={now}
          onEditEvent={onEditEvent}
          onCreateEvent={onCreateEvent}
        />
      ))}
    </div>
  );
}

function WeekDayColumn({ date, events, now, onEditEvent, onCreateEvent }) {
  const isToday = date.toDateString() === now.toDateString();
  const dayEvents = useMemo(
    () => events.filter(e => e.start.toDateString() === date.toDateString()),
    [events, date]
  );

  const HOUR_HEIGHT = 60 * LAYOUT.PIXELS_PER_MINUTE;

  const handleGridClick = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = Math.floor(y / LAYOUT.PIXELS_PER_MINUTE);
      const snapped = Math.round(minutes / LAYOUT.SNAP_MINUTES) * LAYOUT.SNAP_MINUTES;

      const start = new Date(date);
      start.setHours(0, snapped, 0, 0);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + 60);

      onCreateEvent(start, end);
    },
    [date, onCreateEvent]
  );

  return (
    <div style={{ flex: 1, borderRight: "1px solid var(--border)", position: "relative" }}>
      {/* DAY HEADER */}
      <div style={{
        height: 56,
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        background: "var(--panel)",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
        <div style={{ fontWeight: 600 }}>{date.getDate()}</div>
      </div>

      {/* GRID */}
      <div style={{ position: "relative", height: 24 * HOUR_HEIGHT }} onClick={handleGridClick}>
        {isToday && (
          <div className="now-line" style={{ top: getNowPosition() }}>
            <div className="now-dot" />
          </div>
        )}

        {/* GRID LINES */}
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            style={{
              height: HOUR_HEIGHT,
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}
          />
        ))}

        {/* EVENTS */}
        {dayEvents.map((ev) => {
          const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * LAYOUT.PIXELS_PER_MINUTE;
          const height = Math.max(((ev.end - ev.start) / 60000) * LAYOUT.PIXELS_PER_MINUTE, 24);
          const past = ev.end < now;
          const duration = Math.round((ev.end - ev.start) / 60000);

          return (
            <div
              key={ev.id}
              className={past ? "past-event" : ""}
              onClick={(e) => {
                e.stopPropagation();
                onEditEvent(ev);
              }}
              style={{
                position: "absolute",
                top,
                left: 6,
                right: 6,
                height,
                background: "var(--card)",
                borderRadius: 8,
                padding: 8,
                cursor: "pointer",
                zIndex: 3
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{duration}m</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ currentDate, events, onSelectDay }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const startDay = startOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = useMemo(() => {
    const blanks = Array.from({ length: startDay }).fill(null);
    const days = Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1)
    );
    return [...blanks, ...days];
  }, [year, month]);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 16 }}>
        {currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric"
        })}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, opacity: 0.6 }}>
            {d}
          </div>
        ))}

        {grid.map((d, idx) => {
          if (!d) return <div key={idx} />;

          const dayEvents = events.filter(
            e => e.start.toDateString() === d.toDateString()
          );

          return (
            <div
              key={idx}
              onClick={() => onSelectDay(d)}
              style={{
                minHeight: 120,
                padding: 10,
                borderRadius: 12,
                background: "var(--card)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.getDate()}</div>

              {dayEvents.slice(0, 4).map(ev => (
                <div
                  key={ev.id}
                  style={{
                    fontSize: 11,
                    opacity: 0.75,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  • {ev.title}
                </div>
              ))}

              {dayEvents.length > 4 && (
                <div style={{ fontSize: 10, opacity: 0.5 }}>
                  +{dayEvents.length - 4} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// EVENT EDITOR
// ============================================================================

function EventEditor({ event, onSave, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [start, setStart] = useState(
    event?.start ? toTimeInput(event.start) : "09:00"
  );
  const [end, setEnd] = useState(
    event?.end ? toTimeInput(event.end) : "10:00"
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setStart(toTimeInput(event.start));
      setEnd(toTimeInput(event.end));
    }
  }, [event]);

  const submit = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const base = event?.start || new Date();
    const s = fromTimeInput(base, start);
    const e = fromTimeInput(base, end);

    if (e <= s) {
      setError("End time must be after start time");
      return;
    }

    setError(null);
    onSave({
      id: event?.id,
      title: title.trim(),
      start: snapDateToGrid(s),
      end: snapDateToGrid(e)
    });
  };

  // ADD THIS CODE TO YOUR src/Apo.js FILE:

const inputStyle = {
  // Basic input styling - customize as needed
  width: '100%',
  padding: '10px 15px',
  margin: '8px 0',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '16px',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
  color: '#333'
};

  return (
    <Modal onClose={onClose}>
      <div style={{ width: 440, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ marginBottom: 8 }}>
          {event?.id ? "Edit Event" : "New Event"}
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 12 }}>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={inputStyle}
          />
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// MODAL
// ============================================================================

function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

function TimelineOS() {
  const { user, loading: authLoading, logout } = useAuth();
  const { events, loading: eventsLoading, saveEvent, deleteEvent, reload } = useEvents({ user });
  
  const [themeId, setThemeId] = useState("dark");
  const theme = THEMES[themeId];
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Global CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Inter, system-ui, sans-serif; overflow: hidden; }
      .fade-in { animation: fadeIn .35s ease forwards; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .now-line { position: absolute; left: 0; right: 0; height: 2px; background: var(--accent); z-index: 10; animation: pulse 2s infinite ease-in-out; }
      .now-dot { position: absolute; left: -6px; top: -5px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }
      @keyframes pulse { 0% { opacity: .6; } 50% { opacity: 1; } 100% { opacity: .6; } }
      .past-event { opacity: .45; filter: grayscale(.4); }
    `;
    document.head.appendChild(style);
    
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => {
      style.remove();
      clearInterval(tick);
    };
  }, []);

  // Apply theme variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--panel", theme.panel);
    root.style.setProperty("--card", theme.card);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--border", theme.border);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--danger", theme.danger);
  }, [theme]);

  const handleSaveEvent = async (payload) => {
    const success = await saveEvent(payload);
    if (success) {
      setEditorOpen(false);
      await reload();
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      await deleteEvent(id);
      setEditorOpen(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontSize: 14
  };

  if (authLoading) {
    return (
      <div style={{ height: "100vh", background: theme.bg, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Booting Timeline OS…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ height: "100vh", background: "#0B0E11", color: "#F5F5F4", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <h1 style={{ fontSize: 64, marginBottom: 16 }}>Timeline</h1>
        <button onClick={() => signInWithPopup(auth, provider)} style={{ padding: "12px 24px", background: "#F43F5E", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Enter System
        </button>
      </div>
    );
  }

  const renderView = () => {
    switch (viewMode) {
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            events={events}
            now={now}
            onEditEvent={(e) => {
              setEditingEvent(e);
              setEditorOpen(true);
            }}
            onCreateEvent={(date) => {
              const end = new Date(date);
              end.setHours(date.getHours() + 1);
              setEditingEvent({ start: date, end });
              setEditorOpen(true);
            }}
          />
        );
      case "week":
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            now={now}
            onEditEvent={(e) => {
              setEditingEvent(e);
              setEditorOpen(true);
            }}
            onCreateEvent={(start, end) => {
              setEditingEvent({ start, end });
              setEditorOpen(true);
            }}
          />
        );
      case "month":
        return (
          <MonthView
            currentDate={currentDate}
            events={events}
            onSelectDay={(day) => {
              setCurrentDate(day);
              setViewMode("day");
            }}
          />
        );
      default:
        return <div>Select a view</div>;
    }
  };

  return (
    <div className="fade-in" style={{ height: "100vh", display: "flex", background: theme.bg, color: theme.text }}>
      {/* SIDEBAR */}
      <aside style={{ width: LAYOUT.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, padding: 24 }}>
        <h1 style={{ marginBottom: 24 }}>Timeline</h1>

        <button
          onClick={() => {
            setEditingEvent(null);
            setEditorOpen(true);
          }}
          style={{ width: "100%", marginBottom: 16, padding: "12px", background: theme.accent, color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          + New Event
        </button>

        <div style={{ marginTop: 32, display: "flex", gap: 8 }}>
          <button onClick={() => setViewMode("day")} style={{ flex: 1, padding: "8px", background: viewMode === "day" ? theme.accent : "transparent", color: viewMode === "day" ? "white" : theme.text, border: `1px solid ${viewMode === "day" ? theme.accent : theme.border}`, borderRadius: 6, cursor: "pointer" }}>
            Day
          </button>
          <button onClick={() => setViewMode("week")} style={{ flex: 1, padding: "8px", background: viewMode === "week" ? theme.accent : "transparent", color: viewMode === "week" ? "white" : theme.text, border: `1px solid ${viewMode === "week" ? theme.accent : theme.border}`, borderRadius: 6, cursor: "pointer" }}>
            Week
          </button>
          <button onClick={() => setViewMode("month")} style={{ flex: 1, padding: "8px", background: viewMode === "month" ? theme.accent : "transparent", color: viewMode === "month" ? "white" : theme.text, border: `1px solid ${viewMode === "month" ? theme.accent : theme.border}`, borderRadius: 6, cursor: "pointer" }}>
            Month
          </button>
        </div>

        <div style={{ marginTop: 32 }}>
          <button onClick={logout} style={{ width: "100%", padding: "8px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, borderRadius: 6, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ height: LAYOUT.HEADER_HEIGHT, borderBottom: `1px solid ${theme.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong>{viewMode.toUpperCase()} VIEW</strong>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </header>

        <div style={{ flex: 1, position: "relative", overflow: "auto" }}>
          {eventsLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: theme.textMuted }}>Loading events...</div>
          ) : (
            renderView()
          )}
        </div>
      </main>

      {editorOpen && (
        <EventEditor
          event={editingEvent}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default TimelineOS;