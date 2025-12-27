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
const EVENT_HEIGHT = 56;
const ROW_GAP = 12;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;

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
    const nowInterval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    const scheduleMidnightUpdate = () => {
      const currentTime = new Date();
      const nextMidnight = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate() + 1,
        0, 0, 1, 0
      );
      
      const msUntilMidnight = nextMidnight.getTime() - currentTime.getTime();
      
      return setTimeout(() => {
        const newDate = new Date();
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

  /* ===================== AUTO SCROLL TO NOW ===================== */
  
  useEffect(() => {
    if (isToday && dayEvents.length >= 0) {
      setTimeout(() => {
        const timeline = document.querySelector('.timeline-scroll');
        if (timeline) {
          const nowPosition = toLeft(now);
          timeline.scrollTo({
            left: nowPosition - (window.innerWidth / 2),
            behavior: 'smooth'
          });
        }
      }, 300);
    }
  }, [currentDate]);

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
  const weekday = today.toLocaleDateString(undefined, { weekday: "long" });
  const dayDate = today.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const monthYear = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const toLeft = d => ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;
  const nowLeft = toLeft(now);
  const isToday = today.toDateString() === now.toDateString();
  const formatTime = d => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const dayEvents = events.filter(ev => ev.start.toDateString() === today.toDateString());

  const stacked = [];
  dayEvents.forEach(ev => {
    let row = 0;
    while (stacked.some(e => e.row === row && !(ev.end <= e.start || ev.start >= e.end))) row++;
    stacked.push({ ...ev, row });
  });

  const actionEmoji = action => ({
    created: "🟢", updated: "🟡", deleted: "🔴", restored: "🟣"
  }[action] || "⚪");

  /* ===================== AUTH UI ===================== */

  if (!user) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        padding: 20
      }}>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.98)", padding: "48px 32px", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Timeline</h1>
          <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 16 }}>Your life, beautifully organized</p>
          <button 
            onClick={() => signInWithPopup(auth, provider)}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
              transition: "all 0.3s ease"
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

  /* ===================== RENDER ===================== */

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      paddingBottom: "env(safe-area-inset-bottom, 24px)"
    }}>
      <style>
{`
@keyframes shimmer {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.timeline-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

.timeline-scroll::-webkit-scrollbar {
  height: 6px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

input, button {
  -webkit-appearance: none;
  appearance: none;
}
`}
</style>

      {/* ===================== HEADER ===================== */}
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "16px 20px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          {/* Top Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 28, 
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Timeline
              </h1>
              <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                {monthYear}
              </p>
            </div>
            <button
              onClick={() => signOut(auth)}
              style={{
                background: "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 14,
                color: "#64748b",
                fontWeight: 500,
                transition: "all 0.2s ease"
              }}
            >
              Sign out
            </button>
          </div>

          {/* Error Banner */}
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
                  fontSize: 18,
                  color: "#991b1b",
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Space Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
            <button
              onClick={() => setSpaceId(PERSONAL_SPACE_ID)}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: spaceId === PERSONAL_SPACE_ID 
                  ? "linear-gradient(135deg, #667eea, #764ba2)" 
                  : "#f8fafc",
                color: spaceId === PERSONAL_SPACE_ID ? "#fff" : "#475569",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: spaceId === PERSONAL_SPACE_ID ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "none"
              }}
            >
              Personal
            </button>

            <button
              onClick={() => familySpaceId ? setSpaceId(familySpaceId) : createFamilySpace()}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: spaceId === familySpaceId 
                  ? "linear-gradient(135deg, #667eea, #764ba2)" 
                  : "#f8fafc",
                color: spaceId === familySpaceId ? "#fff" : "#475569",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: spaceId === familySpaceId ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "none"
              }}
            >
              {familySpaceId ? "Family" : "+ Create Family"}
            </button>
          </div>

          {/* Date Navigation */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            gap: 12,
            background: "#f8fafc",
            padding: "12px 16px",
            borderRadius: 12
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={goToPreviousDay} style={{ 
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "#475569",
                transition: "all 0.2s ease"
              }}>
                ←
              </button>
              
              <button onClick={goToToday} disabled={isToday} style={{ 
                background: isToday ? "#e2e8f0" : "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: isToday ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: isToday ? "#94a3b8" : "#475569",
                transition: "all 0.2s ease"
              }}>
                Today
              </button>

              <button onClick={goToNextDay} style={{ 
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "#475569",
                transition: "all 0.2s ease"
              }}>
                →
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
                  {weekday}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textAlign: "right" }}>
                  {dayDate}
                </div>
              </div>
              {isToday && (
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  animation: "shimmer 2s infinite"
                }} />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button
              onClick={openNewEvent}
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                transition: "all 0.2s ease",
                flex: 1,
                minWidth: 140
              }}
            >
              + Add Event
            </button>

            <button
              onClick={() => setShowDeletedOverlay(true)}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
                transition: "all 0.2s ease"
              }}
            >
              🗑️ {deletedEvents.length > 0 && `(${deletedEvents.length})`}
            </button>

            <button
              onClick={() => setShowActivityOverlay(true)}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
                transition: "all 0.2s ease"
              }}
            >
              📊
            </button>
          </div>
        </div>
      </div>

      {/* ===================== TIMELINE ===================== */}

      <div style={{ padding: "20px", maxWidth: 1600, margin: "0 auto" }}>
        {loading ? (
          <div style={{
            padding: 60,
            textAlign: "center",
            color: "#64748b",
            fontSize: 15
          }}>
            Loading your timeline...
          </div>
        ) : (
          <div style={{ 
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0"
          }}>
            <div className="timeline-scroll" style={{ overflowX: "auto" }}>
              <div style={{ position: "relative", width: DAY_WIDTH, minHeight: 400, padding: "20px 0" }}>

                {/* Grid lines */}
                {[...Array(48)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: i * 30 * PIXELS_PER_MINUTE,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: i % 2 === 0 ? "#e2e8f0" : "#f1f5f9",
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
                      top: 12,
                      fontSize: 13,
                      color: "#64748b",
                      fontWeight: 600,
                      background: "#fff",
                      padding: "2px 6px",
                      borderRadius: 6
                    }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}

                {/* Now indicator */}
                {isToday && (
                  <>
                    <div style={{
                      position: "absolute",
                      left: nowLeft,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background: "linear-gradient(180deg, #667eea, #764ba2)",
                      zIndex: 10,
                      boxShadow: "0 0 10px rgba(102, 126, 234, 0.5)",
                      borderRadius: 2
                    }} />
                    <div style={{
                      position: "absolute",
                      left: nowLeft - 6,
                      top: 8,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.2)",
                      zIndex: 11
                    }} />
                  </>
                )}

                {/* Empty state */}
                {stacked.length === 0 && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 15
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                    <div style={{ fontWeight: 600 }}>No events today</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Tap "+ Add Event" to get started</div>
                  </div>
                )}

                {/* Events */}
                {stacked.map(ev => {
                  const width = toLeft(ev.end) - toLeft(ev.start);
                  const isSmall = width < 180;
                  
                  return (
                    <div
                      key={ev.id}
                      onClick={() => openEditEvent(ev)}
                      style={{
                        position: "absolute",
                        left: toLeft(ev.start),
                        top: 70 + ev.row * (EVENT_HEIGHT + ROW_GAP),
                        width,
                        height: EVENT_HEIGHT,
                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                        color: "#fff",
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                        transition: "all 0.2s ease",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.2)"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                        e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
                      }}
                    >
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: isSmall ? 13 : 15,
                        marginBottom: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {ev.title}
                      </div>
                      {!isSmall && (
                        <div style={{ fontSize: 12, opacity: 0.9 }}>
                          {formatTime(ev.start)} – {formatTime(ev.end)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================== ACTIVITY OVERLAY ===================== */}

      {showActivityOverlay && (
        <Overlay title="Activity Log" onClose={() => setShowActivityOverlay(false)}>
          {activityLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <div>No activity yet</div>
            </div>
          ) : (
            activityLogs.map(log => (
              <div key={log.id} style={{
                padding: "16px 0",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{actionEmoji(log.action)}</span>
                  <strong style={{ textTransform: "capitalize", fontSize: 15, color: "#0f172a" }}>
                    {log.action}
                  </strong>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", paddingLeft: 30 }}>
                  {log.userEmail}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 30 }}>
                  {log.createdAt?.toDate?.().toLocaleString(undefined, {
                    weekday: "short", year: "numeric", month: "short",
                    day: "numeric", hour: "2-digit", minute: "2-digit",
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
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <div>No deleted events</div>
            </div>
          ) : (
            deletedEvents.map(ev => (
              <div key={ev.id} style={{
                padding: "16px 0",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>
                  {ev.title}
                </div>
                {ev.deletedAt && (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Deleted {ev.deletedAt.toDate().toLocaleString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </div>
                )}
                <button
                  onClick={() => restoreEvent(ev)}
                  style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                    alignSelf: "flex-start",
                    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)"
                  }}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </Overlay>
      )}

      {/* ===================== EVENT MODAL ===================== */}

      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: 20
        }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 480,
            boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
            overflow: "hidden"
          }}>
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                {editingEvent ? "Edit Event" : "New Event"}
              </h3>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                  Event Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What's happening?"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "2px solid #e2e8f0",
                    fontSize: 15,
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border 0.2s ease"
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "2px solid #e2e8f0",
                      fontSize: 14,
                      fontFamily: "inherit"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "2px solid #e2e8f0",
                      fontSize: 14,
                      fontFamily: "inherit"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={saveEvent}
                    disabled={loading}
                    style={{
                      background: loading ? "#94a3b8" : "linear-gradient(135deg, #667eea, #764ba2)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px 24px",
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: 15,
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                    }}
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>

                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "12px 24px",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#64748b"
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
                      padding: "12px 20px",
                      cursor: "pointer",
                      color: "#dc2626",
                      fontWeight: 600,
                      fontSize: 15
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
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
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff",
        width: "100%",
        maxWidth: 440,
        maxHeight: "85vh",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
      }}>
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f8fafc",
              fontSize: 18,
              cursor: "pointer",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              transition: "all 0.2s ease"
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "4px 24px 24px", overflowY: "auto", maxHeight: "calc(85vh - 80px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}