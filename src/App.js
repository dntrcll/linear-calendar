// ============================================================================
// TIMELINE OS — PART 1
// Core System, Constants, Theme Engine, Temporal Engine, App Shell
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
  browserLocalPersistence
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
// SYSTEM META
// ============================================================================

export const APP_META = {
  name: "Timeline OS",
  codename: "Chronos",
  version: "5.0.0-dev",
  build: Date.now(),
  quoteInterval: 1000 * 60 * 60 * 4
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const LAYOUT = {
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 72,
  FOOTER_HEIGHT: 0,
  PIXELS_PER_MINUTE: 2.4,
  SNAP_MINUTES: 15,
  DAY_START_HOUR: 0,
  DAY_END_HOUR: 24,
  YEAR_COLS: 38
};

// ============================================================================
// TEMPORAL ENGINE
// ============================================================================

export function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export function getNowPosition() {
  return minutesSinceMidnight(new Date()) * LAYOUT.PIXELS_PER_MINUTE;
}

export function snapMinutes(mins) {
  return (
    Math.round(mins / LAYOUT.SNAP_MINUTES) *
    LAYOUT.SNAP_MINUTES
  );
}

export function snapDateToGrid(date) {
  const mins = snapMinutes(minutesSinceMidnight(date));
  const d = new Date(date);
  d.setHours(0, mins, 0, 0);
  return d;
}

// ============================================================================
// THEME ENGINE
// ============================================================================

export const THEMES = {
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
// GLOBAL CSS INJECTION
// ============================================================================

const GLOBAL_CSS = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.fade-in {
  animation: fadeIn .35s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* NOW INDICATOR */
.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  z-index: 10;
  animation: pulse 2s infinite ease-in-out;
}

.now-dot {
  position: absolute;
  left: -6px;
  top: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

@keyframes pulse {
  0% { opacity: .6; }
  50% { opacity: 1; }
  100% { opacity: .6; }
}

.past-event {
  opacity: .45;
  filter: grayscale(.4);
}
`;

// ============================================================================
// MAIN APPLICATION ROOT
// ============================================================================

export default function TimelineOS() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const [themeId, setThemeId] = useState("dark");
  const theme = THEMES[themeId];

  const [now, setNow] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const scrollRef = useRef(null);

  // --------------------------------------------------------------------------
  // BOOTSTRAP
  // --------------------------------------------------------------------------

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);

    const tick = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      style.remove();
      clearInterval(tick);
    };
  }, []);

  // --------------------------------------------------------------------------
  // AUTH + DATA LOAD
  // --------------------------------------------------------------------------

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);

    return auth.onAuthStateChanged(async (u) => {
      setUser(u);

      if (!u) {
        setBooting(false);
        return;
      }

      const q = query(
        collection(db, "events"),
        where("uid", "==", u.uid)
      );

      const snap = await getDocs(q);

      const all = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          start: data.startTime.toDate(),
          end: data.endTime.toDate()
        };
      });

      setEvents(all.filter(e => !e.deleted));
      setDeletedEvents(all.filter(e => e.deleted));
      setBooting(false);
    });
  }, []);

  // --------------------------------------------------------------------------
  // EVENT CRUD
  // --------------------------------------------------------------------------

  const saveEvent = useCallback(async (payload) => {
    if (!user) return;

    const data = {
      uid: user.uid,
      title: payload.title,
      startTime: Timestamp.fromDate(payload.start),
      endTime: Timestamp.fromDate(payload.end),
      updatedAt: serverTimestamp(),
      deleted: false
    };

    if (payload.id) {
      await updateDoc(doc(db, "events", payload.id), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "events"), data);
    }
  }, [user]);

  const softDeleteEvent = useCallback(async (id) => {
    await updateDoc(doc(db, "events", id), {
      deleted: true,
      deletedAt: serverTimestamp()
    });
  }, []);

  // --------------------------------------------------------------------------
  // RENDER GUARDS
  // --------------------------------------------------------------------------

  if (booting) {
    return (
      <div style={{
        height: "100vh",
        background: theme.bg,
        color: theme.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        Booting Timeline OS…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} />;
  }

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div
      className="fade-in"
      style={{
        height: "100vh",
        display: "flex",
        background: theme.bg,
        color: theme.text,
        "--bg": theme.bg,
        "--text": theme.text,
        "--border": theme.border,
        "--accent": theme.accent
      }}
    >
      {/* SIDEBAR */}
      <aside style={{
        width: LAYOUT.SIDEBAR_WIDTH,
        background: theme.sidebar,
        borderRight: `1px solid ${theme.border}`,
        padding: 24
      }}>
        <h1 style={{ marginBottom: 24 }}>Timeline</h1>

        <button
          onClick={() => {
            setEditingEvent(null);
            setEditorOpen(true);
          }}
        >
          New Event
        </button>

        <div style={{ marginTop: 32 }}>
          <button onClick={() => setViewMode("day")}>Day</button>
          <button onClick={() => setViewMode("week")}>Week</button>
          <button onClick={() => setViewMode("month")}>Month</button>
        </div>

        <div style={{ marginTop: 32 }}>
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column"
      }}>
        <header style={{
          height: LAYOUT.HEADER_HEIGHT,
          borderBottom: `1px solid ${theme.border}`,
          padding: "0 24px",
          display: "flex",
          alignItems: "center"
        }}>
          <strong>{viewMode.toUpperCase()}</strong>
        </header>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto"
          }}
        >
          {/* VIEWS COME IN PART 2 */}
        </div>
      </main>

      {editorOpen && (
        <EventEditor
          event={editingEvent}
          onClose={() => setEditorOpen(false)}
          onSave={async (e) => {
            await saveEvent(e);
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// AUTH SCREEN
// ============================================================================

function AuthScreen({ onLogin }) {
  return (
    <div style={{
      height: "100vh",
      background: "#0B0E11",
      color: "#F5F5F4",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column"
    }}>
      <h1 style={{ fontSize: 64, marginBottom: 16 }}>
        Timeline
      </h1>
      <button onClick={onLogin}>
        Enter System
      </button>
    </div>
  );
}
// ============================================================================
// TIMELINE OS — PART 2
// DAY VIEW · HOUR GRID · NOW LINE · JOURNAL MODE
// ============================================================================


import { LAYOUT, getNowPosition, snapDateToGrid } from "./TimelineOS";

// ----------------------------------------------------------------------------
// DAY VIEW ROOT
// ----------------------------------------------------------------------------

export function DayView({
  currentDate,
  events,
  now,
  onEditEvent,
  onCreateEvent
}) {
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    []
  );

  const isToday =
    currentDate.toDateString() === now.toDateString();

  const dayEvents = useMemo(
    () =>
      events.filter(
        e =>
          e.start.toDateString() ===
          currentDate.toDateString()
      ),
    [events, currentDate]
  );

  return (
    <div
      style={{
        padding: "40px 80px",
        maxWidth: 960,
        margin: "0 auto",
        position: "relative"
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 2,
            opacity: 0.6,
            marginBottom: 8
          }}
        >
          {currentDate.toLocaleDateString("en-US", {
            weekday: "long"
          })}
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
      <div
        style={{
          position: "relative",
          borderLeft: "1px solid var(--border)",
          paddingLeft: 48
        }}
      >
        {isToday && (
          <div
            className="now-line"
            style={{ top: getNowPosition() }}
          >
            <div className="now-dot" />
          </div>
        )}

        {hours.map((h) => {
          const slotEvents = dayEvents.filter(
            (e) => e.start.getHours() === h
          );

          return (
            <HourSlot
              key={h}
              hour={h}
              events={slotEvents}
              isPast={
                isToday &&
                h < now.getHours()
              }
              onEditEvent={onEditEvent}
              onCreateEvent={(start) => {
                const end = new Date(start);
                end.setHours(start.getHours() + 1);
                onCreateEvent(start, end);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// HOUR SLOT
// ----------------------------------------------------------------------------

function HourSlot({
  hour,
  events,
  isPast,
  onEditEvent,
  onCreateEvent
}) {
  return (
    <div
      style={{
        minHeight: 96,
        position: "relative",
        marginBottom: 12
      }}
    >
      {/* HOUR LABEL */}
      <div
        style={{
          position: "absolute",
          left: -80,
          top: 0,
          fontSize: 14,
          opacity: 0.5,
          width: 60,
          textAlign: "right"
        }}
      >
        {hour}:00
      </div>

      {/* EVENTS */}
      {events.map((ev) => {
        const duration =
          Math.round((ev.end - ev.start) / 60000);

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
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 6
              }}
            >
              {ev.title}
            </div>

            <div
              style={{
                fontSize: 13,
                opacity: 0.7
              }}
            >
              {ev.start.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
              })}{" "}
              –{" "}
              {ev.end.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
              })}{" "}
              · {duration}m
            </div>
          </div>
        );
      })}

      {/* EMPTY SLOT CLICK */}
      {events.length === 0 && (
        <div
          onClick={() => {
            const d = new Date();
            d.setHours(hour, 0, 0, 0);
            onCreateEvent(d);
          }}
          style={{
            height: 64,
            cursor: "pointer"
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 2 END
// NEXT: PART 3 — WEEK VIEW (GRID, DRAG, SNAP, NOW LINE)
// ============================================================================

// (continuing automatically…)
// ============================================================================
// TIMELINE OS — PART 3
// WEEK VIEW · GRID ENGINE · EVENT POSITIONING · NOW LINE
// ============================================================================


import { LAYOUT, getNowPosition } from "./TimelineOS";

// ----------------------------------------------------------------------------
// WEEK VIEW ROOT
// ----------------------------------------------------------------------------

export function WeekView({
  currentDate,
  events,
  now,
  onEditEvent,
  onCreateEvent
}) {
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

// ----------------------------------------------------------------------------
// WEEK DAY COLUMN
// ----------------------------------------------------------------------------

function WeekDayColumn({
  date,
  events,
  now,
  onEditEvent,
  onCreateEvent
}) {
  const isToday = date.toDateString() === now.toDateString();
  const dayEvents = useMemo(
    () =>
      events.filter(
        (e) => e.start.toDateString() === date.toDateString()
      ),
    [events, date]
  );

  const HOUR_HEIGHT = 60 * LAYOUT.PIXELS_PER_MINUTE;

  const handleGridClick = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = Math.floor(y / LAYOUT.PIXELS_PER_MINUTE);
      const snapped =
        Math.round(minutes / LAYOUT.SNAP_MINUTES) *
        LAYOUT.SNAP_MINUTES;

      const start = new Date(date);
      start.setHours(0, snapped, 0, 0);

      const end = new Date(start);
      end.setMinutes(start.getMinutes() + 60);

      onCreateEvent(start, end);
    },
    [date, onCreateEvent]
  );

  return (
    <div
      style={{
        flex: 1,
        borderRight: "1px solid var(--border)",
        position: "relative"
      }}
    >
      {/* DAY HEADER */}
      <div
        style={{
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
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
        <div style={{ fontWeight: 600 }}>{date.getDate()}</div>
      </div>

      {/* GRID */}
      <div
        style={{
          position: "relative",
          height: 24 * HOUR_HEIGHT
        }}
        onClick={handleGridClick}
      >
        {isToday && (
          <div
            className="now-line"
            style={{ top: getNowPosition() }}
          >
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
          const top =
            (ev.start.getHours() * 60 +
              ev.start.getMinutes()) *
            LAYOUT.PIXELS_PER_MINUTE;

          const height =
            Math.max(
              ((ev.end - ev.start) / 60000) *
                LAYOUT.PIXELS_PER_MINUTE,
              24
            );

          const past = ev.end < now;
          const duration =
            Math.round((ev.end - ev.start) / 60000);

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
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {ev.title}
              </div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>
                {duration}m
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 3 END
// NEXT: PART 4 — MONTH VIEW + YEAR VIEW
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 4
// MONTH VIEW · YEAR VIEW · DATE NAVIGATION ENGINE
// ============================================================================


import { LAYOUT } from "./TimelineOS";

// ----------------------------------------------------------------------------
// MONTH VIEW ROOT
// ----------------------------------------------------------------------------

export function MonthView({
  currentDate,
  events,
  onSelectDay
}) {
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 12
        }}
      >
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 12,
              opacity: 0.6
            }}
          >
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
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {d.getDate()}
              </div>

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

// ----------------------------------------------------------------------------
// YEAR VIEW ROOT
// ----------------------------------------------------------------------------

export function YearView({
  currentDate,
  events,
  onSelectDay
}) {
  const year = currentDate.getFullYear();

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)),
    [year]
  );

  return (
    <div style={{ padding: 32, overflowX: "auto" }}>
      <h2 style={{ marginBottom: 24 }}>{year}</h2>

      <div style={{ minWidth: 1100 }}>
        {months.map((m, idx) => (
          <YearMonthRow
            key={idx}
            monthDate={m}
            events={events}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// YEAR MONTH ROW
// ----------------------------------------------------------------------------

function YearMonthRow({ monthDate, events, onSelectDay }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const cols = LAYOUT.YEAR_COLS;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: 6
      }}
    >
      <div
        style={{
          width: 80,
          fontSize: 13,
          opacity: 0.7
        }}
      >
        {monthDate.toLocaleDateString("en-US", { month: "short" })}
      </div>

      <div style={{ display: "flex", flex: 1, gap: 2 }}>
        {Array.from({ length: cols }).map((_, col) => {
          const dayNum = col - startDay + 1;
          if (dayNum < 1 || dayNum > daysInMonth)
            return <div key={col} style={{ flex: 1 }} />;

          const d = new Date(year, month, dayNum);
          const hasEvent = events.some(
            e => e.start.toDateString() === d.toDateString()
          );

          return (
            <div
              key={col}
              onClick={() => onSelectDay(d)}
              style={{
                flex: 1,
                height: 24,
                borderRadius: 4,
                background: hasEvent
                  ? "rgba(255,255,255,0.15)"
                  : "transparent",
                cursor: "pointer"
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 4 END
// NEXT: PART 5 — EVENT EDITOR · MODALS · FORMS
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 5
// EVENT EDITOR · MODALS · FORMS · VALIDATION
// ============================================================================


import { snapDateToGrid } from "./TimelineOS";

// ----------------------------------------------------------------------------
// EVENT EDITOR ROOT
// ----------------------------------------------------------------------------

export function EventEditor({
  event,
  onSave,
  onClose
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [start, setStart] = useState(
    event?.start
      ? toTimeInput(event.start)
      : "09:00"
  );
  const [end, setEnd] = useState(
    event?.end
      ? toTimeInput(event.end)
      : "10:00"
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

  return (
    <Modal onClose={onClose}>
      <div
        style={{
          width: 440,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}
      >
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
          <div style={{ color: "var(--danger)", fontSize: 12 }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12
          }}
        >
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// GENERIC MODAL
// ----------------------------------------------------------------------------

export function Modal({ children, onClose }) {
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

// ----------------------------------------------------------------------------
// TIME UTILS
// ----------------------------------------------------------------------------

function toTimeInput(date) {
  return date.toTimeString().slice(0, 5);
}

function fromTimeInput(baseDate, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

// ----------------------------------------------------------------------------
// INPUT STYLE
// ----------------------------------------------------------------------------

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontSize: 14
};

// ============================================================================
// TIMELINE OS — PART 5 END
// NEXT: PART 6 — DRAG & RESIZE ENGINE (EVENT INTERACTION CORE)
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 6
// DRAG & RESIZE ENGINE · EVENT INTERACTION CORE
// ============================================================================

// Removed duplicate imports to prevent redeclaration error (Cannot redeclare block-scoped variable 'LAYOUT').
// These dependencies are already imported earlier in the file, so they do not need to be imported again.

// ----------------------------------------------------------------------------
// DRAG CONTEXT
// ----------------------------------------------------------------------------

export function useDragResize({
  event,
  onChange,
  onCommit
}) {
  const ref = useRef(null);
  const [mode, setMode] = useState(null); // "drag" | "resize-top" | "resize-bottom"
  const startY = useRef(0);
  const startEvent = useRef(null);

  useEffect(() => {
    if (!mode) return;

    const onMove = (e) => {
      const dy = e.clientY - startY.current;
      const minutesDelta = snapMinutes(
        dy / LAYOUT.PIXELS_PER_MINUTE
      );

      let next = { ...startEvent.current };

      if (mode === "drag") {
        next.start = addMinutes(startEvent.current.start, minutesDelta);
        next.end = addMinutes(startEvent.current.end, minutesDelta);
      }

      if (mode === "resize-top") {
        next.start = addMinutes(startEvent.current.start, minutesDelta);
        if (next.start >= next.end) return;
      }

      if (mode === "resize-bottom") {
        next.end = addMinutes(startEvent.current.end, minutesDelta);
        if (next.end <= next.start) return;
      }

      onChange(next);
    };

    const onUp = () => {
      setMode(null);
      onCommit();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [mode, onChange, onCommit]);

  const bindDrag = () => ({
    onMouseDown: (e) => {
      e.stopPropagation();
      startY.current = e.clientY;
      startEvent.current = { ...event };
      setMode("drag");
    }
  });

  const bindResizeTop = () => ({
    onMouseDown: (e) => {
      e.stopPropagation();
      startY.current = e.clientY;
      startEvent.current = { ...event };
      setMode("resize-top");
    }
  });

  const bindResizeBottom = () => ({
    onMouseDown: (e) => {
      e.stopPropagation();
      startY.current = e.clientY;
      startEvent.current = { ...event };
      setMode("resize-bottom");
    }
  });

  return { ref, bindDrag, bindResizeTop, bindResizeBottom };
}

// ----------------------------------------------------------------------------
// EVENT BLOCK WITH INTERACTION
// ----------------------------------------------------------------------------

export function DraggableEvent({
  event,
  now,
  onPreviewChange,
  onCommit,
  onEdit
}) {
  const { ref, bindDrag, bindResizeTop, bindResizeBottom } =
    useDragResize({
      event,
      onChange: onPreviewChange,
      onCommit
    });

  const top =
    (event.start.getHours() * 60 +
      event.start.getMinutes()) *
    LAYOUT.PIXELS_PER_MINUTE;

  const height =
    Math.max(
      ((event.end - event.start) / 60000) *
        LAYOUT.PIXELS_PER_MINUTE,
      24
    );

  const past = event.end < now;

  return (
    <div
      ref={ref}
      className={past ? "past-event" : ""}
      style={{
        position: "absolute",
        top,
        left: 6,
        right: 6,
        height,
        background: "var(--card)",
        borderRadius: 8,
        cursor: "grab",
        zIndex: 5,
        overflow: "hidden"
      }}
      {...bindDrag()}
      onDoubleClick={() => onEdit(event)}
    >
      {/* RESIZE HANDLE TOP */}
      <div
        {...bindResizeTop()}
        style={{
          height: 6,
          cursor: "ns-resize",
          background: "transparent"
        }}
      />

      <div style={{ padding: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6 }}>
          {formatRange(event.start, event.end)}
        </div>
      </div>

      {/* RESIZE HANDLE BOTTOM */}
      <div
        {...bindResizeBottom()}
        style={{
          height: 6,
          cursor: "ns-resize",
          background: "transparent"
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function formatRange(start, end) {
  return (
    start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) +
    " – " +
    end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

// ============================================================================
// TIMELINE OS — PART 6 END
// NEXT: PART 7 — TAG SYSTEM · COLOR ENGINE · FILTERING
// ============================================================================
// ============================================================================
// TIMELINE OS — PART 7
// TAG SYSTEM · COLOR ENGINE · FILTERING · PERSISTENCE
// ============================================================================



// ----------------------------------------------------------------------------
// DEFAULT TAG PALETTE
// ----------------------------------------------------------------------------

export const TAG_PALETTE = {
  onyx: {
    id: "onyx",
    bg: "#18181B",
    text: "#FAFAFA",
    border: "#3F3F46"
  },
  rose: {
    id: "rose",
    bg: "#FFF1F2",
    text: "#9F1239",
    border: "#FDA4AF"
  },
  emerald: {
    id: "emerald",
    bg: "#ECFDF5",
    text: "#065F46",
    border: "#6EE7B7"
  },
  amber: {
    id: "amber",
    bg: "#FFFBEB",
    text: "#92400E",
    border: "#FCD34D"
  },
  sky: {
    id: "sky",
    bg: "#EFF6FF",
    text: "#1E3A8A",
    border: "#93C5FD"
  },
  violet: {
    id: "violet",
    bg: "#F5F3FF",
    text: "#5B21B6",
    border: "#C4B5FD"
  }
};

// ----------------------------------------------------------------------------
// DEFAULT TAGS
// ----------------------------------------------------------------------------

export const DEFAULT_TAGS = [
  {
    id: "work",
    name: "Work",
    palette: "onyx"
  },
  {
    id: "health",
    name: "Health",
    palette: "emerald"
  },
  {
    id: "family",
    name: "Family",
    palette: "rose"
  },
  {
    id: "finance",
    name: "Finance",
    palette: "amber"
  }
];

// ----------------------------------------------------------------------------
// TAG STORE (LOCAL)
// ----------------------------------------------------------------------------

export function useTagStore() {
  const [tags, setTags] = useState(() => {
    const raw = localStorage.getItem("timeline.tags");
    return raw ? JSON.parse(raw) : DEFAULT_TAGS;
  });

  const [activeTagIds, setActiveTagIds] = useState(() =>
    tags.map((t) => t.id)
  );

  useEffect(() => {
    localStorage.setItem("timeline.tags", JSON.stringify(tags));
  }, [tags]);

  const toggleTag = (id) => {
    setActiveTagIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const addTag = (name, palette) => {
    const id =
      name.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Date.now();
    setTags((prev) => [...prev, { id, name, palette }]);
  };

  const removeTag = (id) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setActiveTagIds((prev) => prev.filter((x) => x !== id));
  };

  return {
    tags,
    activeTagIds,
    toggleTag,
    addTag,
    removeTag
  };
}

// ----------------------------------------------------------------------------
// TAG FILTERING
// ----------------------------------------------------------------------------

export function useFilteredEvents(events, activeTagIds) {
  return useMemo(() => {
    if (!activeTagIds || activeTagIds.length === 0)
      return events;
    return events.filter((e) =>
      activeTagIds.includes(e.tag)
    );
  }, [events, activeTagIds]);
}

// ----------------------------------------------------------------------------
// TAG BADGE
// ----------------------------------------------------------------------------

export function TagBadge({ tag }) {
  const palette = TAG_PALETTE[tag.palette] || TAG_PALETTE.onyx;

  return (
    <span
      style={{
        padding: "4px 8px",
        fontSize: 11,
        borderRadius: 999,
        background: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`
      }}
    >
      {tag.name}
    </span>
  );
}

// ----------------------------------------------------------------------------
// TAG SELECTOR (EDITOR)
// ----------------------------------------------------------------------------

export function TagSelector({
  tags,
  value,
  onChange
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {tags.map((t) => {
        const palette =
          TAG_PALETTE[t.palette] || TAG_PALETTE.onyx;
        const active = value === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              border: `1px solid ${
                active ? palette.text : palette.border
              }`,
              background: active ? palette.bg : "transparent",
              color: active ? palette.text : "var(--text)",
              cursor: "pointer"
            }}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 7 END
// NEXT: PART 8 — FAMILY SPACE · CONTEXT SWITCH · SHARED EVENTS
// ============================================================================
// ============================================================================
// TIMELINE OS — PART 8
// FAMILY SPACE · CONTEXT SWITCH · SHARED EVENTS · PERMISSIONS
// ============================================================================


import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// ----------------------------------------------------------------------------
// CONTEXT DEFINITIONS
// ----------------------------------------------------------------------------

export const CONTEXTS = {
  personal: {
    id: "personal",
    label: "Personal",
    accent: "#F43F5E"
  },
  family: {
    id: "family",
    label: "Family",
    accent: "#10B981"
  }
};

// ----------------------------------------------------------------------------
// CONTEXT STORE
// ----------------------------------------------------------------------------

export function useContextSpace() {
  const [context, setContext] = useState("personal");

  useEffect(() => {
    const saved = localStorage.getItem("timeline.context");
    if (saved) setContext(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("timeline.context", context);
  }, [context]);

  return { context, setContext };
}

// ----------------------------------------------------------------------------
// FAMILY SPACE DATA LOADER
// ----------------------------------------------------------------------------

export function useFamilyEvents({
  user,
  context
}) {
  const [familyEvents, setFamilyEvents] = useState([]);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------------------------------
  // LOAD FAMILY ID
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const loadFamily = async () => {
      const q = query(
        collection(db, "families"),
        where("members", "array-contains", user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setFamilyId(snap.docs[0].id);
      }
    };

    loadFamily();
  }, [user]);

  // --------------------------------------------------------------------------
  // LOAD EVENTS
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (context !== "family" || !familyId) return;

    const loadEvents = async () => {
      setLoading(true);

      const q = query(
        collection(db, "familyEvents"),
        where("familyId", "==", familyId)
      );

      const snap = await getDocs(q);
      const events = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          start: data.startTime.toDate(),
          end: data.endTime.toDate()
        };
      });

      setFamilyEvents(events);
      setLoading(false);
    };

    loadEvents();
  }, [context, familyId]);

  return {
    familyId,
    familyEvents,
    loading
  };
}

// ----------------------------------------------------------------------------
// SAVE FAMILY EVENT
// ----------------------------------------------------------------------------

export async function saveFamilyEvent({
  familyId,
  payload
}) {
  const data = {
    familyId,
    title: payload.title,
    startTime: payload.start,
    endTime: payload.end,
    tag: payload.tag || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (payload.id) {
    await updateDoc(
      doc(db, "familyEvents", payload.id),
      data
    );
  } else {
    await addDoc(collection(db, "familyEvents"), data);
  }
}

// ----------------------------------------------------------------------------
// CONTEXT SWITCHER UI
// ----------------------------------------------------------------------------

export function ContextSwitcher({
  context,
  setContext
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 999,
        padding: 4,
        gap: 4
      }}
    >
      {Object.values(CONTEXTS).map((c) => (
        <button
          key={c.id}
          onClick={() => setContext(c.id)}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 13,
            cursor: "pointer",
            border: "none",
            background:
              context === c.id
                ? c.accent
                : "transparent",
            color:
              context === c.id
                ? "#fff"
                : "var(--text)"
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// PERMISSION HELPERS
// ----------------------------------------------------------------------------

export function canEditFamilyEvent({
  user,
  event
}) {
  return event.createdBy === user.uid;
}

// ============================================================================
// TIMELINE OS — PART 8 END
// NEXT: PART 9 — TRASH · SOFT DELETE · RESTORE · ACTIVITY LOG
// ============================================================================
// ============================================================================
// TIMELINE OS — PART 9
// TRASH · SOFT DELETE · RESTORE · ACTIVITY LOG · AUDIT TRAIL
// ============================================================================


import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// ----------------------------------------------------------------------------
// ACTIVITY TYPES
// ----------------------------------------------------------------------------

export const ACTIVITY_TYPES = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  RESTORE: "restore",
  PURGE: "purge"
};

// ----------------------------------------------------------------------------
// ACTIVITY LOGGER
// ----------------------------------------------------------------------------

export async function logActivity({
  uid,
  context,
  type,
  entityId,
  payload = {}
}) {
  await addDoc(collection(db, "activity"), {
    uid,
    context,
    type,
    entityId,
    payload,
    createdAt: serverTimestamp()
  });
}

// ----------------------------------------------------------------------------
// TRASH STORE
// ----------------------------------------------------------------------------

export function useTrash({ user, context }) {
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTrash = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, "events"),
      where("uid", "==", user.uid),
      where("deleted", "==", true)
    );

    const snap = await getDocs(q);
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        start: data.startTime.toDate(),
        end: data.endTime.toDate()
      };
    });

    setTrash(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const restore = async (id) => {
    await updateDoc(doc(db, "events", id), {
      deleted: false,
      restoredAt: serverTimestamp()
    });

    await logActivity({
      uid: user.uid,
      context,
      type: ACTIVITY_TYPES.RESTORE,
      entityId: id
    });

    loadTrash();
  };

  const purge = async (id) => {
    await deleteDoc(doc(db, "events", id));

    await logActivity({
      uid: user.uid,
      context,
      type: ACTIVITY_TYPES.PURGE,
      entityId: id
    });

    loadTrash();
  };

  return {
    trash,
    loading,
    restore,
    purge,
    reload: loadTrash
  };
}

// ----------------------------------------------------------------------------
// TRASH MODAL
// ----------------------------------------------------------------------------

export function TrashModal({
  open,
  onClose,
  trash,
  onRestore,
  onPurge
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          height: "70vh",
          background: "var(--panel)",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Trash</h2>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {trash.length === 0 && (
            <div style={{ opacity: 0.6, textAlign: "center" }}>
              Trash is empty
            </div>
          )}

          {trash.map((ev) => (
            <div
              key={ev.id}
              style={{
                padding: 12,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  {ev.start.toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onRestore(ev.id)}
                >
                  Restore
                </button>
                <button
                  onClick={() => onPurge(ev.id)}
                  style={{ color: "var(--danger)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// ACTIVITY FEED
// ----------------------------------------------------------------------------

export function ActivityFeed({ user, context }) {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const q = query(
        collection(db, "activity"),
        where("uid", "==", user.uid),
        where("context", "==", context)
      );

      const snap = await getDocs(q);
      setActivity(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    };

    load();
  }, [user, context]);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Activity</h3>

      {activity.map((a) => (
        <div
          key={a.id}
          style={{
            fontSize: 12,
            opacity: 0.7,
            marginBottom: 8
          }}
        >
          {a.type} · {new Date(a.createdAt.seconds * 1000).toLocaleString()}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 9 END
// NEXT: PART 10 — NOTIFICATIONS · REMINDERS · TIME-BASED TRIGGERS
// ============================================================================



// ============================================================================
// TIMELINE OS — PART 10
// NOTIFICATIONS · REMINDERS · TIME-BASED TRIGGERS · LOCAL + FIRESTORE
// ============================================================================


import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// ----------------------------------------------------------------------------
// NOTIFICATION TYPES
// ----------------------------------------------------------------------------

export const NOTIFICATION_TYPES = {
  UPCOMING: "upcoming",
  START: "start",
  OVERDUE: "overdue",
  DAILY_DIGEST: "daily_digest"
};

// ----------------------------------------------------------------------------
// LOCAL NOTIFICATION QUEUE
// ----------------------------------------------------------------------------

export function useNotificationQueue() {
  const [queue, setQueue] = useState([]);

  const push = useCallback((n) => {
    setQueue((q) => [...q, { id: Date.now() + Math.random(), ...n }]);
  }, []);

  const remove = useCallback((id) => {
    setQueue((q) => q.filter((n) => n.id !== id));
  }, []);

  return { queue, push, remove };
}

// ----------------------------------------------------------------------------
// NOTIFICATION TOASTS
// ----------------------------------------------------------------------------

export function NotificationToasts({ queue, onDismiss }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      {queue.map((n) => (
        <div
          key={n.id}
          style={{
            background: "var(--panel)",
            borderRadius: 12,
            padding: "12px 16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            minWidth: 260
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {n.title}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {n.message}
          </div>
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <button onClick={() => onDismiss(n.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// REMINDER ENGINE (LOCAL)
// ----------------------------------------------------------------------------

export function useReminderEngine({
  events,
  now,
  notify
}) {
  const fired = useRef(new Set());

  useEffect(() => {
    events.forEach((ev) => {
      const startMs = ev.start.getTime();
      const nowMs = now.getTime();

      // 15-min warning
      const warningMs = startMs - 15 * 60 * 1000;
      const warnKey = ev.id + ":warn";

      if (
        nowMs >= warningMs &&
        nowMs < startMs &&
        !fired.current.has(warnKey)
      ) {
        fired.current.add(warnKey);
        notify({
          title: "Upcoming Event",
          message: `${ev.title} starts in 15 minutes`
        });
      }

      // start
      const startKey = ev.id + ":start";
      if (
        nowMs >= startMs &&
        nowMs < startMs + 60000 &&
        !fired.current.has(startKey)
      ) {
        fired.current.add(startKey);
        notify({
          title: "Event Started",
          message: ev.title
        });
      }
    });
  }, [events, now, notify]);
}

// ----------------------------------------------------------------------------
// FIRESTORE REMINDER PERSISTENCE
// ----------------------------------------------------------------------------

export async function saveReminder({
  uid,
  eventId,
  offsetMinutes
}) {
  await addDoc(collection(db, "reminders"), {
    uid,
    eventId,
    offsetMinutes,
    createdAt: serverTimestamp()
  });
}

export async function loadReminders(uid) {
  const q = query(
    collection(db, "reminders"),
    where("uid", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function markReminderSent(id) {
  await updateDoc(doc(db, "reminders", id), {
    sentAt: serverTimestamp()
  });
}

// ============================================================================
// TIMELINE OS — PART 10 END
// NEXT: PART 11 — KEYBOARD COMMAND PALETTE · SHORTCUTS · NAVIGATION
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 11
// KEYBOARD COMMAND PALETTE · SHORTCUTS · GLOBAL NAVIGATION
// ============================================================================



// ----------------------------------------------------------------------------
// COMMAND DEFINITIONS
// ----------------------------------------------------------------------------

export const COMMANDS = [
  {
    id: "new-event",
    label: "Create new event",
    shortcut: "N",
    action: ({ openEditor }) => openEditor()
  },
  {
    id: "go-today",
    label: "Go to today",
    shortcut: "T",
    action: ({ setCurrentDate }) => setCurrentDate(new Date())
  },
  {
    id: "view-day",
    label: "Switch to Day view",
    shortcut: "D",
    action: ({ setViewMode }) => setViewMode("day")
  },
  {
    id: "view-week",
    label: "Switch to Week view",
    shortcut: "W",
    action: ({ setViewMode }) => setViewMode("week")
  },
  {
    id: "view-month",
    label: "Switch to Month view",
    shortcut: "M",
    action: ({ setViewMode }) => setViewMode("month")
  },
  {
    id: "open-trash",
    label: "Open Trash",
    shortcut: "X",
    action: ({ openTrash }) => openTrash()
  }
];

// ----------------------------------------------------------------------------
// COMMAND PALETTE HOOK
// ----------------------------------------------------------------------------

export function useCommandPalette(bindings) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const execute = useCallback(
    (cmd) => {
      cmd.action(bindings);
      setOpen(false);
      setQuery("");
    },
    [bindings]
  );

  useEffect(() => {
    const onKey = (e) => {
      // Cmd / Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }

      if (!open) return;

      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return { open, setOpen, query, setQuery, filtered, execute };
}

// ----------------------------------------------------------------------------
// COMMAND PALETTE UI
// ----------------------------------------------------------------------------

export function CommandPalette({
  open,
  query,
  setQuery,
  commands,
  onExecute
}) {
  if (!open) return null;

  return (
    <div
      onClick={() => onExecute(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "var(--panel)",
          borderRadius: 16,
          padding: 16
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            marginBottom: 12
          }}
        />

        <div>
          {commands.map((c) => (
            <div
              key={c.id}
              onClick={() => onExecute(c)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <span>{c.label}</span>
              <span style={{ opacity: 0.6 }}>{c.shortcut}</span>
            </div>
          ))}

          {commands.length === 0 && (
            <div style={{ opacity: 0.6, padding: 12 }}>
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 11 END
// NEXT: PART 12 — LIFE OS MODULES · HABITS · GOALS · PROGRESS TRACKING
// ============================================================================


// ============================================================================
// TIMELINE OS — PART 12
// LIFE OS MODULES · HABITS · GOALS · PROGRESS TRACKING · DASHBOARD
// ============================================================================


import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// ----------------------------------------------------------------------------
// HABIT MODEL
// ----------------------------------------------------------------------------

export const HABIT_FREQUENCY = {
  DAILY: "daily",
  WEEKLY: "weekly"
};

// ----------------------------------------------------------------------------
// HABIT STORE
// ----------------------------------------------------------------------------

export function useHabits({ user }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const q = query(
        collection(db, "habits"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(q);
      setHabits(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
      setLoading(false);
    };

    load();
  }, [user]);

  const createHabit = async (name, frequency) => {
    const docRef = await addDoc(collection(db, "habits"), {
      uid: user.uid,
      name,
      frequency,
      streak: 0,
      lastCompleted: null,
      createdAt: serverTimestamp()
    });

    setHabits((h) => [
      ...h,
      {
        id: docRef.id,
        name,
        frequency,
        streak: 0,
        lastCompleted: null
      }
    ]);
  };

  const completeHabit = async (habit) => {
    const now = new Date();
    const last = habit.lastCompleted
      ? habit.lastCompleted.toDate()
      : null;

    let newStreak = habit.streak;

    if (!last || !isSameDay(last, now)) {
      newStreak += 1;
    }

    await updateDoc(doc(db, "habits", habit.id), {
      streak: newStreak,
      lastCompleted: serverTimestamp()
    });

    setHabits((h) =>
      h.map((x) =>
        x.id === habit.id
          ? { ...x, streak: newStreak, lastCompleted: now }
          : x
      )
    );
  };

  return {
    habits,
    loading,
    createHabit,
    completeHabit
  };
}

// ----------------------------------------------------------------------------
// HABITS PANEL
// ----------------------------------------------------------------------------

export function HabitsPanel({ habits, onComplete }) {
  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Habits</h3>

      {habits.map((h) => (
        <div
          key={h.id}
          style={{
            padding: 12,
            borderRadius: 12,
            background: "var(--card)",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{h.name}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {h.streak} day streak
            </div>
          </div>

          <button onClick={() => onComplete(h)}>
            ✓
          </button>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GOALS
// ----------------------------------------------------------------------------

export function useGoals({ user }) {
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const q = query(
        collection(db, "goals"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(q);
      setGoals(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    };

    load();
  }, [user]);

  const createGoal = async (title, target) => {
    const docRef = await addDoc(collection(db, "goals"), {
      uid: user.uid,
      title,
      target,
      progress: 0,
      createdAt: serverTimestamp()
    });

    setGoals((g) => [
      ...g,
      {
        id: docRef.id,
        title,
        target,
        progress: 0
      }
    ]);
  };

  const updateProgress = async (goal, value) => {
    const next = Math.min(goal.progress + value, goal.target);

    await updateDoc(doc(db, "goals", goal.id), {
      progress: next
    });

    setGoals((g) =>
      g.map((x) =>
        x.id === goal.id ? { ...x, progress: next } : x
      )
    );
  };

  return {
    goals,
    createGoal,
    updateProgress
  };
}

// ----------------------------------------------------------------------------
// GOALS PANEL
// ----------------------------------------------------------------------------

export function GoalsPanel({ goals, onProgress }) {
  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Goals</h3>

      {goals.map((g) => {
        const pct = Math.round((g.progress / g.target) * 100);

        return (
          <div
            key={g.id}
            style={{
              padding: 12,
              borderRadius: 12,
              background: "var(--card)",
              marginBottom: 8
            }}
          >
            <div style={{ fontWeight: 600 }}>{g.title}</div>

            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 999,
                marginTop: 8
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--accent)",
                  borderRadius: 999
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                opacity: 0.6,
                marginTop: 4
              }}
            >
              <span>{pct}%</span>
              <button onClick={() => onProgress(g, 1)}>+1</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ============================================================================
// TIMELINE OS — PART 12 END
// NEXT: PART 13 — SETTINGS · THEMES · PREFERENCES · PERSISTENCE
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 13
// SETTINGS · THEMES · PREFERENCES · PERSISTENCE · UI TOKENS
// ============================================================================


// ----------------------------------------------------------------------------
// THEME TOKENS
// ----------------------------------------------------------------------------

// THEME TOKENS
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// SETTINGS STORE
// ----------------------------------------------------------------------------

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem("timeline.settings");
    return raw
      ? JSON.parse(raw)
      : {
          theme: "dark",
          use24h: false,
          weekStartMonday: true,
          blurPast: true,
          reduceMotion: false
        };
  });

  useEffect(() => {
    localStorage.setItem(
      "timeline.settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  return { settings, setSettings };
}

// ----------------------------------------------------------------------------
// APPLY THEME TO DOCUMENT
// ----------------------------------------------------------------------------

export function useApplyTheme(themeId) {
  useEffect(() => {
    const t = THEMES[themeId] || THEMES.dark;
    const root = document.documentElement;

    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--panel", t.panel);
    root.style.setProperty("--card", t.card);
    root.style.setProperty("--text", t.text);
    root.style.setProperty("--muted", t.muted);
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--danger", t.danger);
    root.style.setProperty("--shadow", t.shadow);
  }, [themeId]);
}

// ----------------------------------------------------------------------------
// SETTINGS MODAL
// ----------------------------------------------------------------------------

export function SettingsModal({
  open,
  settings,
  setSettings,
  onClose
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "var(--panel)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "var(--shadow)"
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Settings</h2>

        <SettingRow
          label="Theme"
          description="Light or Dark"
        >
          <select
            value={settings.theme}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                theme: e.target.value
              }))
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </SettingRow>

        <ToggleRow
          label="24-hour time"
          value={settings.use24h}
          onChange={(v) =>
            setSettings((s) => ({ ...s, use24h: v }))
          }
        />

        <ToggleRow
          label="Week starts Monday"
          value={settings.weekStartMonday}
          onChange={(v) =>
            setSettings((s) => ({
              ...s,
              weekStartMonday: v
            }))
          }
        />

        <ToggleRow
          label="Blur past events"
          value={settings.blurPast}
          onChange={(v) =>
            setSettings((s) => ({ ...s, blurPast: v }))
          }
        />

        <ToggleRow
          label="Reduce motion"
          value={settings.reduceMotion}
          onChange={(v) =>
            setSettings((s) => ({
              ...s,
              reduceMotion: v
            }))
          }
        />

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SETTING ROWS
// ----------------------------------------------------------------------------

function SettingRow({ label, description, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        {description}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
      }}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 13 END
// NEXT: PART 14 — APP SHELL · COMPOSITION · FINAL WIRES
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 14
// APP SHELL · COMPOSITION · FINAL WIRES · BOOTSTRAP
// ============================================================================


import {
  useSettings,
  useApplyTheme
} from "./settings";
import {
  useContextSpace,
  CONTEXTS
} from "./family";
import {
  useTagStore,
  useFilteredEvents
} from "./tags";
import {
  useNotificationQueue,
  NotificationToasts,
  useReminderEngine
} from "./notifications";
import {
  useCommandPalette,
  CommandPalette
} from "./commands";
import {
  useTrash,
  TrashModal
} from "./trash";

import { DayView } from "./day";
import { WeekView } from "./week";
import { MonthView, YearView } from "./month";
import { EventEditor } from "./editor";

// ----------------------------------------------------------------------------
// APP ROOT
// ----------------------------------------------------------------------------

export default function TimelineApp({
  user,
  events,
  setEvents
}) {
  // --------------------------------------------------------------------------
  // GLOBAL STATE
  // --------------------------------------------------------------------------

  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());

  const [editingEvent, setEditingEvent] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  // --------------------------------------------------------------------------
  // SETTINGS / THEME
  // --------------------------------------------------------------------------

  const { settings, setSettings } = useSettings();
  useApplyTheme(settings.theme);

  // --------------------------------------------------------------------------
  // CONTEXT (PERSONAL / FAMILY)
  // --------------------------------------------------------------------------

  const { context, setContext } = useContextSpace();

  // --------------------------------------------------------------------------
  // TAGS
  // --------------------------------------------------------------------------

  const tagStore = useTagStore();
  const filteredEvents = useFilteredEvents(
    events,
    tagStore.activeTagIds
  );

  // --------------------------------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------------------------------

  const notifications = useNotificationQueue();
  useReminderEngine({
    events: filteredEvents,
    now,
    notify: notifications.push
  });

  // --------------------------------------------------------------------------
  // COMMAND PALETTE
  // --------------------------------------------------------------------------

  const palette = useCommandPalette({
    openEditor: () => {
      setEditingEvent(null);
      setEditorOpen(true);
    },
    setCurrentDate,
    setViewMode,
    openTrash: () => setTrashOpen(true)
  });

  // --------------------------------------------------------------------------
  // TRASH
  // --------------------------------------------------------------------------

  const trash = useTrash({ user, context });

  // --------------------------------------------------------------------------
  // CLOCK TICK
  // --------------------------------------------------------------------------

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(i);
  }, []);

  // --------------------------------------------------------------------------
  // SAVE EVENT
  // --------------------------------------------------------------------------

  const saveEvent = (payload) => {
    setEvents((evs) => {
      if (payload.id) {
        return evs.map((e) =>
          e.id === payload.id ? { ...e, ...payload } : e
        );
      }
      return [
        ...evs,
        {
          ...payload,
          id: "local-" + Date.now()
        }
      ];
    });
    setEditorOpen(false);
  };

  // --------------------------------------------------------------------------
  // RENDER VIEW
  // --------------------------------------------------------------------------

  const renderView = () => {
    switch (viewMode) {
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            events={filteredEvents}
            now={now}
            onEditEvent={(e) => {
              setEditingEvent(e);
              setEditorOpen(true);
            }}
            onCreateEvent={(s, e) => {
              setEditingEvent({ start: s, end: e });
              setEditorOpen(true);
            }}
          />
        );

      case "week":
        return (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            now={now}
            onEditEvent={(e) => {
              setEditingEvent(e);
              setEditorOpen(true);
            }}
            onCreateEvent={(s, e) => {
              setEditingEvent({ start: s, end: e });
              setEditorOpen(true);
            }}
          />
        );

      case "month":
        return (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            onSelectDay={(d) => {
              setCurrentDate(d);
              setViewMode("day");
            }}
          />
        );

      case "year":
        return (
          <YearView
            currentDate={currentDate}
            events={filteredEvents}
            onSelectDay={(d) => {
              setCurrentDate(d);
              setViewMode("day");
            }}
          />
        );

      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: "var(--bg)",
        color: "var(--text)"
      }}
    >
      {/* MAIN */}
      <div style={{ flex: 1, position: "relative" }}>
        {renderView()}
      </div>

      {/* EDITOR */}
      {editorOpen && (
        <EventEditor
          event={editingEvent}
          onSave={saveEvent}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* TRASH */}
      <TrashModal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        trash={trash.trash}
        onRestore={trash.restore}
        onPurge={trash.purge}
      />

      {/* COMMAND PALETTE */}
      <CommandPalette
        open={palette.open}
        query={palette.query}
        setQuery={palette.setQuery}
        commands={palette.filtered}
        onExecute={(cmd) => {
          if (cmd) palette.execute(cmd);
          else palette.setOpen(false);
        }}
      />

      {/* NOTIFICATIONS */}
      <NotificationToasts
        queue={notifications.queue}
        onDismiss={notifications.remove}
      />
    </div>
  );
}

// ============================================================================
// TIMELINE OS — PART 14 END
// NEXT: PART 15 — INDEX · EXPORT MAP · FINAL ASSEMBLY
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 15
// INDEX · EXPORT MAP · FINAL ASSEMBLY · PUBLIC API
// ============================================================================

// ---------------------------------------------------------------------------
// CORE EXPORTS
// ---------------------------------------------------------------------------

// Note: Fix import to use correct casing to avoid file name casing conflicts
export { default as TimelineApp } from "./App";

// Views
export { DayView } from "./day";
export { WeekView } from "./week";
export { MonthView, YearView } from "./month";

// Editor / Modals
export { EventEditor } from "./editor";
export { TrashModal } from "./trash";
export { SettingsModal } from "./settings";

// Systems
export { useSettings, useApplyTheme } from "./settings";
export { useContextSpace, CONTEXTS } from "./family";
export { useTagStore, useFilteredEvents } from "./tags";
export {
  useNotificationQueue,
  NotificationToasts,
  useReminderEngine
} from "./notifications";
export {
  useCommandPalette,
  CommandPalette
} from "./commands";
export { useTrash } from "./trash";

// Life OS
export {
  useHabits,
  HabitsPanel,
  useGoals,
  GoalsPanel
} from "./life";

// Drag / Resize
export {
  DraggableEvent,
  useDragResize
} from "./drag";

// Utils
export * from "./utils";

// ============================================================================
// TIMELINE OS — PART 15 END
// NEXT: PART 16 — UTILS · DATE MATH · GRID HELPERS · SNAP ENGINE
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 16
// UTILS · DATE MATH · GRID HELPERS · SNAP ENGINE
// ============================================================================

// ---------------------------------------------------------------------------
// LAYOUT CONSTANTS
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// TIME SNAP
// ---------------------------------------------------------------------------

export function snapMinutes(minutes) {
  return (
    Math.round(minutes / LAYOUT.SNAP_MINUTES) *
    LAYOUT.SNAP_MINUTES
  );
}

export function snapDateToGrid(date) {
  const d = new Date(date);
  const mins = d.getMinutes();
  d.setMinutes(snapMinutes(mins), 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// NOW LINE POSITION
// ---------------------------------------------------------------------------

export function getNowPosition(now = new Date()) {
  const minutes =
    now.getHours() * 60 + now.getMinutes();
  return minutes * LAYOUT.PIXELS_PER_MINUTE;
}

// ---------------------------------------------------------------------------
// DATE HELPERS
// ---------------------------------------------------------------------------

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date, monday = true) {
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

// ============================================================================
// TIMELINE OS — PART 16 END
// NEXT: PART 17 — AUTH · FIREBASE BOOTSTRAP · DATA SYNC
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 17
// AUTH · FIREBASE BOOTSTRAP · DATA SYNC · PERSISTENCE
// ============================================================================


import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { auth, provider, db } from "./firebase";

// ---------------------------------------------------------------------------
// AUTH HOOK
// ---------------------------------------------------------------------------

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}

export function login() {
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

// ---------------------------------------------------------------------------
// EVENTS STORE (PERSONAL)
// ---------------------------------------------------------------------------

export function useEvents({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const q = query(
        collection(db, "events"),
        where("uid", "==", user.uid),
        where("deleted", "==", false)
      );
      const snap = await getDocs(q);
      setEvents(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            start: data.startTime.toDate(),
            end: data.endTime.toDate()
          };
        })
      );
      setLoading(false);
    };

    load();
  }, [user]);

  const save = async (payload) => {
    const data = {
      uid: user.uid,
      title: payload.title,
      startTime: payload.start,
      endTime: payload.end,
      tag: payload.tag || null,
      updatedAt: serverTimestamp(),
      deleted: false
    };

    if (payload.id && !payload.id.startsWith("local")) {
      await updateDoc(doc(db, "events", payload.id), data);
    } else {
      await addDoc(collection(db, "events"), {
        ...data,
        createdAt: serverTimestamp()
      });
    }
  };

  return { events, setEvents, save, loading };
}

// ============================================================================
// TIMELINE OS — PART 17 END
// NEXT: PART 18 — ROOT APP ENTRY · MAIN BOOT · AUTH GATE
// ============================================================================

// ============================================================================
// TIMELINE OS — PART 18
// ROOT APP ENTRY · MAIN BOOT · AUTH GATE
// ============================================================================

import TimelineApp from "./App";
import { useAuth, useEvents, login } from "./auth";

export default function AppRoot() {
  const { user, loading } = useAuth();
  const eventsStore = useEvents({ user });

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column"
        }}
      >
        <h1 style={{ fontSize: 48, marginBottom: 16 }}>
          Timeline
        </h1>
        <button onClick={login}>Sign in</button>
      </div>
    );
  }

  return (
    <TimelineApp
      user={user}
      events={eventsStore.events}
      setEvents={eventsStore.setEvents}
    />
  );
}

// ============================================================================
// TIMELINE OS — PART 18 END
// NEXT: PART 19 — CSS BASE · MOTION · VISUAL POLISH
// ============================================================================

/* ============================================================================
   TIMELINE OS — PART 19
   CSS BASE · MOTION · VISUAL POLISH
   ========================================================================== */

   /* Move these styles to App.css or into a <style> tag if you want to use CSS variables */
   /*
   :root {
    --bg: #0b0e11;
    --panel: #111418;
    --card: #181b21;
    --text: #f5f5f4;
    :root {
      --bg: #0b0e11;
      --panel: #111418;
      --card: #181b21;
      --text: #f5f5f4;
      --muted: #a8a29e;
      --border: #292524;
      --accent: #3b82f6;
      --danger: #f43f5e;
    }
   
   * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: Inter, system-ui, sans-serif;
  }
  
  button {
    background: none;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
  }
  
  button:hover {
    background: rgba(255,255,255,0.05);
  }
  
  .past-event {
    opacity: 0.5;
  }
  
  .now-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--danger);
    z-index: 2;
  }

  .now-dot {
    position: absolute;
    left: -6px;
    top: -3px;
    width: 6px;
    height: 6px;
    background: var(--danger);
    border-radius: 50%;
  }
  
  /* ============================================================================
     TIMELINE OS — PART 19 END
     SYSTEM COMPLETE (≈5,000+ LINES ACROSS PARTS)
     ========================================================================== */
  