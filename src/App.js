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
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);
  const [familySpaceId, setFamilySpaceId] = useState(null);

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showActivityOverlay, setShowActivityOverlay] = useState(false);
  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  /* ===================== AUTH ===================== */

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  /* ===================== LOAD EVENTS ===================== */

  const loadEvents = async () => {
    if (!user || !spaceId) return;

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
      deletedSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    );
  };

  /* ===================== LOAD ACTIVITY ===================== */

  const loadActivity = async () => {
    const q = query(
      collection(db, "activityLogs"),
      where("spaceId", "==", spaceId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadEvents();
    loadActivity();
  }, [user, spaceId]);

  /* ===================== ACTIVITY LOGGER ===================== */

  const logActivity = async (action, eventId) => {
    await addDoc(collection(db, "activityLogs"), {
      action, // created | updated | deleted | restored
      eventId,
      spaceId,
      userEmail: user.email,
      createdAt: serverTimestamp(),
    });
  };

  /* ===================== SPACES ===================== */

  const createFamilySpace = async () => {
    const ref = await addDoc(collection(db, "spaces"), {
      name: "Family",
      ownerId: user.uid,
      members: [user.uid],
      type: "shared",
      createdAt: serverTimestamp(),
    });
    setFamilySpaceId(ref.id);
    setSpaceId(ref.id);
  };

  /* ===================== EVENT MODAL ===================== */

  const openNewEvent = () => {
    setEditingEvent(null);
    setTitle("");
    setStartTime("");
    setEndTime("");
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
    if (!title || !startTime || !endTime) return;

    if (editingEvent) {
      await updateDoc(doc(db, "events", editingEvent.id), {
        title,
        startTime: Timestamp.fromDate(new Date(startTime)),
        endTime: Timestamp.fromDate(new Date(endTime)),
      });
      await logActivity("updated", editingEvent.id);
    } else {
      const ref = await addDoc(collection(db, "events"), {
        spaceId,
        title,
        startTime: Timestamp.fromDate(new Date(startTime)),
        endTime: Timestamp.fromDate(new Date(endTime)),
        deleted: false,
        createdAt: serverTimestamp(),
      });
      await logActivity("created", ref.id);
    }

    setShowModal(false);
    loadEvents();
    loadActivity();
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    await updateDoc(doc(db, "events", editingEvent.id), {
      deleted: true,
      deletedAt: serverTimestamp(),
    });

    await logActivity("deleted", editingEvent.id);
    setShowModal(false);
    loadEvents();
    loadActivity();
  };

  const restoreEvent = async ev => {
    await updateDoc(doc(db, "events", ev.id), { deleted: false });
    await logActivity("restored", ev.id);
    loadEvents();
    loadActivity();
  };

  /* ===================== TIME HELPERS ===================== */


  const today = new Date();

const weekday = today.toLocaleDateString(undefined, {
  weekday: "long",
});

const dayDate = today.toLocaleDateString(undefined, {
  day: "2-digit",
  month: "short",
});

const year = today.getFullYear();

  

  const dayLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
  });

  const dateLabel = today.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const toLeft = d =>
    ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;

  const nowLeft = toLeft(new Date());


  const isToday =
  today.toDateString() === startOfDay.toDateString();


  const formatTime = d =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* ===================== STACK EVENTS ===================== */

  const stacked = [];
  events.forEach(ev => {
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
      <div style={{ padding: 24 }}>
        <button onClick={() => signInWithPopup(auth, provider)}>
          Sign in with Google
        </button>
      </div>
    );
  }

  /* ===================== RENDER ===================== */

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <style>
{`
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16,185,129,0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(16,185,129,0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16,185,129,0);
  }
}
`}
</style>

      <h2>Welcome, {user.displayName}</h2>

      <header style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14,}}>
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
  Recently Deleted
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
  }}
>
  Sign out
</button>


      </header>

      {/* ===================== TIMELINE ===================== */}

      {/* ===== DATE HEADER ===== */}
<div
  style={{
    marginTop: 12,
    marginBottom: 12,
    paddingLeft: 4,
  }}
>
  <div
    style={{
      fontSize: 18,
      fontWeight: 600,
      color: "#111827",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    Thursday
    <span
  style={{
    marginLeft: 10,
    marginTop: 6,          // 👈 this moves it DOWN
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
    color: "#065f46",
    background: "#ecfdf5",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    height: 20,
  }}
>
  <span
    style={{
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "#10b981",
      marginRight: 6,
      animation: "pulse 1.5s infinite",
    }}
  />
  Today
</span>


  </div>

  <div
    style={{
      fontSize: 14,
      fontWeight: 600,
      color: "#6b7280",
      marginTop: 2,
    }}
  >
    25 Dec 2025
  </div>
</div>


      <div style={{ marginTop: 12, border: "1px solid #ccc", overflowX: "scroll" }}>
        <div style={{ position: "relative", width: DAY_WIDTH, height: 320 }}>

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

          {[...Array(24)].map((_, h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                left: h * 60 * PIXELS_PER_MINUTE + 6,
                top: 6,
                fontSize: 12,
                color: "#374151",
                fontWeight: 600,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}

          <div
            style={{
              position: "absolute",
              left: nowLeft,
              top: 0,
              bottom: 0,
              width: 2,
              background: "red",
            }}
          />

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
                background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                color: "#fff",
                borderRadius: 10,
                padding: 8,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{ev.title}</div>
              <div style={{ fontSize: 12 }}>
                {formatTime(ev.start)} – {formatTime(ev.end)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================== ACTIVITY OVERLAY ===================== */}

      {showActivityOverlay && (
  <Overlay
    title="Activity Log"
    onClose={() => setShowActivityOverlay(false)}
  >
    {activityLogs.map(log => (
      <div
        key={log.id}
        style={{
          padding: "12px 0",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>
            {actionEmoji(log.action)}
          </span>
          <strong style={{ textTransform: "capitalize" }}>
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
    ))}
  </Overlay>
)}


      {/* ===================== DELETED OVERLAY ===================== */}

      {showDeletedOverlay && (
        <Overlay title="Recently Deleted" onClose={() => setShowDeletedOverlay(false)}>
          {deletedEvents.map(ev => (
  <div
    key={ev.id}
    style={{
      padding: "14px 0",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}
  >
    <div style={{ fontWeight: 600 }}>
      {ev.title}
    </div>

    {ev.deletedAt && (
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        Deleted at{" "}
        {ev.deletedAt.toDate().toLocaleString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    )}

    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => restoreEvent(ev)}
        style={{
          background: "#ecfeff",
          border: "1px solid #06b6d4",
          color: "#0e7490",
          borderRadius: 8,
          padding: "6px 14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Restore Event
      </button>
    </div>
  </div>
))}

        </Overlay>
      )}

      {/* ===================== EVENT MODAL ===================== */}
      {showModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
    }}
  >
    <div
      style={{
        background: "#ffffff",
        padding: 28,
        borderRadius: 16,
        width: 460,
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <h3 style={{ margin: 0 }}>
        {editingEvent ? "Edit Event" : "Add Event"}
      </h3>

      {/* TITLE */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </div>

      {/* START */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Start</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </div>

      {/* END */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>End</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={saveEvent}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>

          <button
            onClick={() => setShowModal(false)}
            style={{
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        {editingEvent && (
          <button
            onClick={deleteEvent}
            style={{
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "red", fontWeight: 600 }}>
              Delete
            </span>
          </button>
        )}
      </div>
    </div>
  </div>
)}

      {/* ===================== LEGACY MODAL (PRESERVED) ===================== */}
      {/*
        This block is intentionally preserved as legacy reference.
        It is not executed and not removed per owner instruction.
      */}

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
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          width: 420,
          maxHeight: "70vh",
          borderRadius: 12,
          padding: 16,
          overflowY: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            border: "none",
            background: "transparent",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
