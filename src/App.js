import { useEffect, useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
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
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

/* ===================== CONSTANTS ===================== */

const PIXELS_PER_MINUTE = 3;
const EVENT_HEIGHT = 52;
const ROW_GAP = 10;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;
const headerButtonBase = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#1f2937",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.15s ease",
};

const headerButtonActive = {
  background: "#eef2ff",
  borderColor: "#2563eb",
  color: "#1e3a8a",
  fontWeight: 600,
};

const headerButtonPrimary = {
  background: "#2563eb",
  border: "1px solid #2563eb",
  color: "#ffffff",
  fontWeight: 600,
};

/* ===================== APP ===================== */

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);
  const [familySpaceId, setFamilySpaceId] = useState(null);

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showActivityOverlay, setShowActivityOverlay] = useState(false);
  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  /* ===================== AUTH ===================== */

  useEffect(() => auth.onAuthStateChanged(setUser), []);
  
  /* ===================== MIDNIGHT + NOW UPDATER ===================== */
  
  useEffect(() => {
    // Update "now" every minute for red line accuracy
    const nowInterval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Every 60 seconds

    // Schedule midnight rollover
    const scheduleMidnightUpdate = () => {
      const currentTime = new Date();
      const nextMidnight = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate() + 1,
        0, 0, 1, 0
      );
      
      const msUntilMidnight = nextMidnight.getTime() - currentTime.getTime();
      
      console.log(`⏰ Midnight update scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
      
      return setTimeout(() => {
        const newDate = new Date();
        console.log(`🌅 Midnight rollover: ${newDate.toDateString()}`);
        setCurrentDate(newDate);
        setNow(newDate);
        scheduleMidnightUpdate();
      }, msUntilMidnight);
    };

    const midnightTimer = scheduleMidnightUpdate();

    return () => {
      clearInterval(nowInterval);
      clearTimeout(midnightTimer);
    };
  }, []);

  /* ===================== LOAD EVENTS ===================== */

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
      setError("Failed to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== LOAD ACTIVITY ===================== */

  const loadActivity = async () => {
    if (!user || !spaceId) return;

    try {
      const q = query(
        collection(db, "activityLogs"),
        where("spaceId", "==", spaceId),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading activity:", err);
    }
  };

  useEffect(() => {
    loadEvents();
    loadActivity();
  }, [user, spaceId]);

  /* ===================== ACTIVITY LOGGER ===================== */

  const logActivity = async (action, eventId) => {
    try {
      await addDoc(collection(db, "activityLogs"), {
        action,
        eventId,
        spaceId,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  /* ===================== SPACES ===================== */

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
      setError("Failed to create family space.");
    }
  };

  /* ===================== EVENT MODAL ===================== */

  const openNewEvent = () => {
    setEditingEvent(null);
    setTitle("");
    
    const start = new Date(currentDate);
    start.setHours(now.getHours(), 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    
    setStartTime(start.toISOString().slice(0, 16));
    setEndTime(end.toISOString().slice(0, 16));
    setShowModal(true);
  };

  const openEditEvent = ev => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setStartTime(ev.start.toISOString().slice(0, 16));
    setEndTime(ev.end.toISOString().slice(0, 16));
    setShowModal(true);
  };

  const saveEvent = async () => {
    if (!title || !startTime || !endTime) {
      setError("Please fill in all fields.");
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      setError("End time must be after start time.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (editingEvent) {
        await updateDoc(doc(db, "events", editingEvent.id), {
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
        });
        await logActivity("updated", editingEvent.id);
      } else {
        const ref = await addDoc(collection(db, "events"), {
          spaceId,
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
          deleted: false,
          createdAt: serverTimestamp(),
        });
        await logActivity("created", ref.id);
      }

      setShowModal(false);
      await loadEvents();
      await loadActivity();
    } catch (err) {
      console.error("Error saving event:", err);
      setError("Failed to save event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await updateDoc(doc(db, "events", editingEvent.id), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });

      await logActivity("deleted", editingEvent.id);
      setShowModal(false);
      await loadEvents();
      await loadActivity();
    } catch (err) {
      console.error("Error deleting event:", err);
      setError("Failed to delete event.");
    }
  };

  const restoreEvent = async ev => {
    try {
      await updateDoc(doc(db, "events", ev.id), { deleted: false });
      await logActivity("restored", ev.id);
      await loadEvents();
      await loadActivity();
    } catch (err) {
      console.error("Error restoring event:", err);
      setError("Failed to restore event.");
    }
  };

  /* ===================== DATE NAVIGATION ===================== */

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

  /* ===================== TIME HELPERS ===================== */

  const today = currentDate;

  const weekday = today.toLocaleDateString(undefined, {
    weekday: "long",
  });

  const dayDate = today.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const toLeft = d =>
    ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;

  const nowLeft = toLeft(now);

  const isToday = today.toDateString() === now.toDateString();

  const formatTime = d =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* ===================== FILTER EVENTS FOR CURRENT DAY ===================== */

  const dayEvents = events.filter(ev => {
    const evDate = ev.start.toDateString();
    return evDate === today.toDateString();
  });

  /* ===================== STACK EVENTS ===================== */

  const stacked = [];
  dayEvents.forEach(ev => {
    let row = 0;
    while (
      stacked.some(
        e => e.row === row && !(ev.end <= e.start || ev.start >= e.end)
      )
    ) row++;
    stacked.push({ ...ev, row });
  });

  /* ===================== ACTIVITY ICONS ===================== */

  const actionEmoji = action =>
    ({
      created: "🟢",
      updated: "🟡",
      deleted: "🔴",
      restored: "🟣",
    }[action] || "⚪");

  /* ===================== AUTH UI ===================== */

  if (!user) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#f9fafb"
      }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <h1 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Timeline Calendar</h1>
          <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 15 }}>Your linear calendar experience</p>
          <button 
            onClick={() => signInWithPopup(auth, provider)}
            style={{
              ...headerButtonBase,
              ...headerButtonPrimary,
              fontSize: 16,
              padding: "12px 24px"
            }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  /* ===================== RENDER ===================== */

  return (
    <div style={{ 
      padding: "12px 16px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 1600, 
      margin: "0 auto",
      paddingBottom: "env(safe-area-inset-bottom, 20px)"
    }}>
      <style>
{`
@keyframes todayPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
  }
}

.today-badge {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #065f46;
  background: #ecfdf5;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  height: 22px;
  gap: 6px;
}

.today-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: todayPulse 2s ease-in-out infinite;
}

/* iOS Safari fixes */
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

input, button {
  -webkit-appearance: none;
  appearance: none;
}

/* Smooth scrolling for timeline */
.timeline-container {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
`}
</style>

      <h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700 }}>
        Welcome, {user.displayName?.split(' ')[0] || 'there'}
      </h2>

      {error && (
        <div style={{
          padding: "12px 16px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          color: "#991b1b",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14
        }}>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#991b1b",
              padding: 0,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>
      )}

      <header style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          onClick={() => setSpaceId(PERSONAL_SPACE_ID)}
          style={{
            ...headerButtonBase,
            ...(spaceId === PERSONAL_SPACE_ID ? headerButtonActive : {}),
          }}
        >
          Personal
        </button>

        <button
          onClick={() =>
            familySpaceId ? setSpaceId(familySpaceId) : createFamilySpace()
          }
          style={{
            ...headerButtonBase,
            ...(spaceId === familySpaceId ? headerButtonActive : {}),
          }}
        >
          {familySpaceId ? "Family" : "Create Family Space"}
        </button>

        <button
          onClick={openNewEvent}
          style={{
            ...headerButtonBase,
            ...headerButtonPrimary,
          }}
        >
          + Add Event
        </button>

        <button
          onClick={() => setShowDeletedOverlay(true)}
          style={{
            ...headerButtonBase,
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          Recently Deleted {deletedEvents.length > 0 && `(${deletedEvents.length})`}
        </button>

        <button
          onClick={() => setShowActivityOverlay(true)}
          style={headerButtonBase}
        >
          Activity Log
        </button>

        <button
          onClick={() => signOut(auth)}
          style={{
            ...headerButtonBase,
            opacity: 0.85,
            marginLeft: "auto"
          }}
        >
          Sign out
        </button>
      </header>

      {/* ===================== DATE NAVIGATION ===================== */}

      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 10,
        marginTop: 20,
        marginBottom: 16,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={goToPreviousDay}
            style={{
              ...headerButtonBase,
              padding: "8px 14px",
              minWidth: 70
            }}
          >
            ← Prev
          </button>
          
          <button
            onClick={goToToday}
            disabled={isToday}
            style={{
              ...headerButtonBase,
              padding: "8px 14px",
              opacity: isToday ? 0.5 : 1,
              cursor: isToday ? "not-allowed" : "pointer",
              minWidth: 70
            }}
          >
            Today
          </button>

          <button
            onClick={goToNextDay}
            style={{
              ...headerButtonBase,
              padding: "8px 14px",
              minWidth: 70
            }}
          >
            Next →
          </button>
        </div>

        <div style={{ 
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 200
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
          }}>
            {weekday}
          </div>

          {isToday && (
            <span className="today-badge">
              <span className="today-dot" />
              Today
            </span>
          )}

          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#6b7280"
          }}>
            {dayDate}
          </div>
        </div>
      </div>

      {/* ===================== TIMELINE ===================== */}

      {loading && (
        <div style={{
          padding: 40,
          textAlign: "center",
          color: "#6b7280",
          fontSize: 15
        }}>
          Loading events...
        </div>
      )}

      {!loading && (
        <div style={{ 
          marginTop: 12, 
          border: "1px solid #d1d5db", 
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div className="timeline-container" style={{ overflowX: "auto" }}>
            <div style={{ position: "relative", width: DAY_WIDTH, height: 320, minHeight: 320 }}>

              {/* Half-hour grid lines */}
              {[...Array(48)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: i * 30 * PIXELS_PER_MINUTE,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: i % 2 === 0 ? "#e5e7eb" : "#f3f4f6",
                  }}
                />
              ))}

              {/* Hour labels */}
              {[...Array(24)].map((_, h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: h * 60 * PIXELS_PER_MINUTE + 6,
                    top: 8,
                    fontSize: 12,
                    color: "#374151",
                    fontWeight: 600,
                  }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}

              {/* Current time indicator (red line) */}
              {isToday && (
                <div
                  style={{
                    position: "absolute",
                    left: nowLeft,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "#ef4444",
                    zIndex: 10,
                    boxShadow: "0 0 4px rgba(239, 68, 68, 0.5)"
                  }}
                />
              )}

              {/* Empty state */}
              {stacked.length === 0 && (
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: "#9ca3af",
                  fontSize: 14,
                  textAlign: "center"
                }}>
                  No events scheduled for this day
                </div>
              )}

              {/* Event blocks */}
              {stacked.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => openEditEvent(ev)}
                  style={{
                    position: "absolute",
                    left: toLeft(ev.start),
                    top: 60 + ev.row * (EVENT_HEIGHT + ROW_GAP),
                    width: toLeft(ev.end) - toLeft(ev.start),
                    height: EVENT_HEIGHT,
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "10px 12px",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                    transition: "all 0.2s ease",
                    overflow: "hidden"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.4)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.3)";
                  }}
                >
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>
                    {formatTime(ev.start)} – {formatTime(ev.end)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== ACTIVITY OVERLAY ===================== */}

      {showActivityOverlay && (
        <Overlay
          title="Activity Log"
          onClose={() => setShowActivityOverlay(false)}
        >
          {activityLogs.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
              No activity yet
            </div>
          ) : (
            activityLogs.map(log => (
              <div
                key={log.id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>
                    {actionEmoji(log.action)}
                  </span>
                  <strong style={{ textTransform: "capitalize", fontSize: 15 }}>
                    {log.action}
                  </strong>
                </div>

                <div style={{ fontSize: 13, color: "#374151" }}>
                  {log.userEmail}
                </div>

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {log.createdAt?.toDate?.().toLocaleString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          )}
        </Overlay>
      )}

      {/* ===================== DELETED OVERLAY ===================== */}

      {showDeletedOverlay && (
        <Overlay title="Recently Deleted" onClose={() => setShowDeletedOverlay(false)}>
          {deletedEvents.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
              No deleted events
            </div>
          ) : (
            deletedEvents.map(ev => (
              <div
                key={ev.id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {ev.title}
                </div>

                {ev.deletedAt && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Deleted {ev.deletedAt.toDate().toLocaleString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                <div style={{ marginTop: 4 }}>
                  <button
                    onClick={() => restoreEvent(ev)}
                    style={{
                      background: "#ecfeff",
                      border: "1px solid #06b6d4",
                      color: "#0e7490",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 14,
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#cffafe"}
                    onMouseLeave={e => e.currentTarget.style.background = "#ecfeff"}
                  >
                    Restore Event
                  </button>
                </div>
              </div>
            ))
          )}
        </Overlay>
      )}

      {/* ===================== EVENT MODAL ===================== */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 16
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: 16,
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              {editingEvent ? "Edit Event" : "Add Event"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter event title"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={saveEvent}
                  disabled={loading}
                  style={{
                    background: loading ? "#93c5fd" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 20px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 15,
                    transition: "all 0.15s ease"
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                    padding: "10px 20px",
                    cursor: "pointer",
                    fontSize: 15,
                    transition: "all 0.15s ease"
                  }}
                >
                  Cancel
                </button>
              </div>

              {editingEvent && (
                <button
                  onClick={deleteEvent}
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    padding: "10px 20px",
                    cursor: "pointer",
                    color: "#dc2626",
                    fontWeight: 600,
                    fontSize: 15,
                    transition: "all 0.15s ease"
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== OVERLAY COMPONENT ===================== */

function Overlay({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 420,
          maxHeight: "80vh",
          borderRadius: 12,
          padding: 20,
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            border: "none",
            background: "transparent",
            fontSize: 20,
            cursor: "pointer",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s ease",
            color: "#6b7280"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          ✕
        </button>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}