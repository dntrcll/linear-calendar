import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================

const APP_NAME = "Nexus";
const VERSION = "2.0.0-Ultimate";

// Layout Geometry
const CONFIG = {
  PIXELS_PER_MINUTE: 1.8,
  SNAP_MINUTES: 15,
  MIN_EVENT_DURATION_MINS: 15,
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 72,
  YEAR_COLUMNS: 38, // 31 days + max offset
};

// Aesthetics & Themes
const THEMES = {
  light: {
    id: 'light',
    bg: "#FAFAFA",
    sidebar: "#FFFFFF",
    card: "#FFFFFF",
    text: "#0F172A", // Slate 900
    textSecondary: "#64748B", // Slate 500
    border: "#E2E8F0", // Slate 200
    gridLine: "#F1F5F9",
    accent: "#3B82F6", // Blue 500
    weekendBg: "#F8FAFC",
    activeItem: "#EFF6FF",
    glass: "rgba(255, 255, 255, 0.8)",
    shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  dark: {
    id: 'dark',
    bg: "#0B0E11", // Deep Midnight
    sidebar: "#11161F",
    card: "#181E2A",
    text: "#F8FAFC", // Slate 50
    textSecondary: "#94A3B8", // Slate 400
    border: "#252D3D",
    gridLine: "#1E293B",
    accent: "#3B82F6", // Blue 500
    weekendBg: "#0F131A",
    activeItem: "#1E3A8A", // Blue 900
    glass: "rgba(17, 22, 31, 0.8)",
    shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
  }
};

// Tag System
const TAG_PALETTE = [
  { id: 'blue',    name: "Ocean",   bg: "#172554", border: "#3B82F6", text: "#93C5FD", dot: "#3B82F6" },
  { id: 'emerald', name: "Forest",  bg: "#022C22", border: "#10B981", text: "#6EE7B7", dot: "#10B981" },
  { id: 'amber',   name: "Sunset",  bg: "#451A03", border: "#F59E0B", text: "#FDE68A", dot: "#F59E0B" },
  { id: 'purple',  name: "Nebula",  bg: "#2E1065", border: "#8B5CF6", text: "#C4B5FD", dot: "#8B5CF6" },
  { id: 'rose',    name: "Crimson", bg: "#4C0519", border: "#F43F5E", text: "#FDA4AF", dot: "#F43F5E" },
  { id: 'slate',   name: "Stone",   bg: "#1E293B", border: "#94A3B8", text: "#E2E8F0", dot: "#94A3B8" },
];

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Deep Work", ...TAG_PALETTE[0] },
  { id: "personal", name: "Personal", ...TAG_PALETTE[3] },
  { id: "health", name: "Health", ...TAG_PALETTE[1] },
];

// Global CSS Injection
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
  
  :root { --ease-out: cubic-bezier(0.16, 1, 0.3, 1); }
  
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-font-smoothing: antialiased; }
  
  body { 
    font-family: 'Inter', sans-serif; 
    overflow: hidden; 
    transition: background 0.3s ease, color 0.3s ease;
  }
  
  h1, h2, h3, h4, .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
  
  /* Scrollbar Polish */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.4); }
  
  /* Animations */
  .fade-in { animation: fadeIn 0.4s var(--ease-out) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 
    70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } 
  }

  .past-day-blur { opacity: 0.4; filter: grayscale(0.8); transition: opacity 0.3s; }
  
  /* Utilities */
  .flex-center { display: flex; align-items: center; justify-content: center; }
  .abs-fill { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
  .no-select { user-select: none; }
  .cursor-pointer { cursor: pointer; }
  
  /* Switches & Inputs */
  .toggle-switch { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #334155; transition: 0.3s; cursor: pointer; }
  .toggle-switch.active { background: #3B82F6; }
  .toggle-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: 0.3s var(--ease-out); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-switch.active .toggle-knob { transform: translateX(20px); }
`;

// ==========================================
// 2. HELPER UTILITIES
// ==========================================

const DateUtils = {
  isToday: (d) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  },
  isPast: (d) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
  },
  getWeekStart: (date, startMon) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (startMon ? (day === 0 ? -6 : 1) : 0);
    return new Date(d.setDate(diff));
  },
  getWeekDays: (centerDate, startMon) => {
    const start = DateUtils.getWeekStart(centerDate, startMon);
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  },
  fmtTime: (date, use24) => date.toLocaleTimeString([], { hour: use24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !use24 }),
};

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================

export default function NexusCalendar() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("year"); // Default view per request
  
  // Persistent Settings
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem('nexus_config_v2');
      return s ? JSON.parse(s) : {
        darkMode: true,
        use24Hour: false,
        blurPast: true,
        weekStartMon: true,
        categories: DEFAULT_CATEGORIES
      };
    } catch { return { darkMode: true, use24Hour: false, blurPast: true, weekStartMon: true, categories: DEFAULT_CATEGORIES }; }
  });
  
  const [activeTags, setActiveTags] = useState(settings.categories.map(c => c.id));
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Interaction State
  const [editingEvent, setEditingEvent] = useState(null);
  const [dragData, setDragData] = useState(null);
  
  // Refs
  const scrollRef = useRef(null);
  const theme = settings.darkMode ? THEMES.dark : THEMES.light;

  // --- EFFECTS ---

  // Inject Styles
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  // Auth & Data
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    return auth.onAuthStateChanged(u => {
      setUser(u);
      if(u) loadEvents(u);
    });
  }, []);

  // Clock & Persistence
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => localStorage.setItem('nexus_config_v2', JSON.stringify(settings)), [settings]);

  // Scroll to 8 AM on View Change
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60 * CONFIG.PIXELS_PER_MINUTE;
    }
  }, [viewMode]);

  // --- DATA OPERATIONS ---

  const loadEvents = async (currentUser) => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, "events"), where("uid", "==", currentUser.uid), where("deleted", "==", false));
      const snap = await getDocs(q);
      const evs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          start: data.startTime.toDate(),
          end: data.endTime.toDate()
        };
      });
      setEvents(evs);
    } catch (e) {
      addNotification("Error loading data", "error");
    }
  };

  const handleSaveEvent = async (formData) => {
    try {
      const payload = {
        uid: user.uid,
        title: formData.title,
        category: formData.category,
        startTime: Timestamp.fromDate(formData.start),
        endTime: Timestamp.fromDate(formData.end),
        deleted: false,
        updatedAt: serverTimestamp()
      };

      if (formData.id) {
        await updateDoc(doc(db, "events", formData.id), payload);
        addNotification("Event updated");
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "events"), payload);
        addNotification("Event created");
      }
      setModalOpen(false);
      loadEvents(user);
    } catch (e) {
      addNotification("Save failed", "error");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Move to trash?")) return;
    try {
      await updateDoc(doc(db, "events", id), { deleted: true });
      setModalOpen(false);
      loadEvents(user);
      addNotification("Event moved to trash");
    } catch (e) { addNotification("Delete failed", "error"); }
  };

  const addNotification = (msg, type='info') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 4000);
  };

  // --- DRAG ENGINE ---

  const handleDragStart = (e, ev, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragData({
      id: ev.id,
      mode, // 'move' or 'resize'
      startY: e.clientY,
      origStart: ev.start,
      origEnd: ev.end
    });
  };

  const handleDragMove = useCallback((e) => {
    if (!dragData) return;
    const deltaPixels = e.clientY - dragData.startY;
    const deltaMins = Math.floor(deltaPixels / CONFIG.PIXELS_PER_MINUTE / CONFIG.SNAP_MINUTES) * CONFIG.SNAP_MINUTES;
    
    if (deltaMins === 0) return;

    setEvents(prev => prev.map(ev => {
      if (ev.id !== dragData.id) return ev;
      
      const newStart = new Date(dragData.origStart);
      const newEnd = new Date(dragData.origEnd);

      if (dragData.mode === 'move') {
        newStart.setMinutes(newStart.getMinutes() + deltaMins);
        newEnd.setMinutes(newEnd.getMinutes() + deltaMins);
      } else {
        newEnd.setMinutes(newEnd.getMinutes() + deltaMins);
        // Minimum duration check
        if ((newEnd - newStart) < CONFIG.MIN_EVENT_DURATION_MINS * 60000) return ev;
      }
      return { ...ev, start: newStart, end: newEnd };
    }));
  }, [dragData]);

  const handleDragEnd = useCallback(async () => {
    if (!dragData) return;
    const ev = events.find(e => e.id === dragData.id);
    if (ev) {
      // Optimistic update done in state, now save to DB
      try {
        await updateDoc(doc(db, "events", ev.id), {
          startTime: Timestamp.fromDate(ev.start),
          endTime: Timestamp.fromDate(ev.end)
        });
      } catch (e) {
        addNotification("Failed to sync move", "error");
        loadEvents(user); // Revert on error
      }
    }
    setDragData(null);
  }, [dragData, events, user]);

  useEffect(() => {
    if (dragData) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragData, handleDragMove, handleDragEnd]);


  // --- VIEW LOGIC ---

  const navigate = (amt) => {
    const d = new Date(currentDate);
    if (viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if (viewMode === 'week') d.setDate(d.getDate() + (amt * 7));
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  // --- SUB-COMPONENTS (Render Props for simplicity within one file) ---

  const Sidebar = () => (
    <div className="no-select" style={{ width: CONFIG.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: 24, zIndex: 20 }}>
      {/* Brand */}
      <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${theme.accent}, #60A5FA)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 15px ${theme.accent}66` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h1 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{APP_NAME}</h1>
      </div>

      {/* Primary Action */}
      <button 
        onClick={() => { setEditingEvent(null); setModalOpen(true); }}
        style={{ width: "100%", padding: "14px", borderRadius: 12, background: theme.accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${theme.accent}40`, marginBottom: 32, transition: "transform 0.1s" }}
        onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      >
        + New Event
      </button>

      {/* Filters */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>Filters</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {settings.categories.map(cat => {
            const active = activeTags.includes(cat.id);
            return (
              <div 
                key={cat.id} 
                onClick={() => setActiveTags(p => p.includes(cat.id) ? p.filter(x => x !== cat.id) : [...p, cat.id])}
                className="cursor-pointer"
                style={{ 
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, 
                  background: active ? theme.weekendBg : "transparent", opacity: active ? 1 : 0.5, transition: "all 0.2s" 
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.dot, boxShadow: `0 0 8px ${cat.dot}66` }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{cat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings Trigger */}
      <button 
        onClick={() => setShowSettings(true)}
        style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 8, color: theme.textSecondary, background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}
      >
        <span style={{ fontSize: 18 }}>⚙</span> Settings
      </button>
    </div>
  );

  const Header = () => (
    <header style={{ height: CONFIG.HEADER_HEIGHT, background: theme.bg, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
      <div className="flex-center" style={{ gap: 24 }}>
        <h2 className="font-heading" style={{ fontSize: 24, fontWeight: 700, color: theme.text, minWidth: 200 }}>
          {viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex-center" style={{ gap: 4, background: theme.sidebar, padding: 4, borderRadius: 8, border: `1px solid ${theme.border}` }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent", color: theme.text, cursor: "pointer" }}>←</button>
          <button onClick={() => setCurrentDate(new Date())} style={{ padding: "0 12px", height: 32, borderRadius: 6, border: "none", background: "transparent", color: theme.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Today</button>
          <button onClick={() => navigate(1)} style={{ width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent", color: theme.text, cursor: "pointer" }}>→</button>
        </div>
      </div>

      <div className="flex-center" style={{ background: theme.sidebar, padding: 4, borderRadius: 8, border: `1px solid ${theme.border}` }}>
        {['day', 'week', 'year'].map(mode => (
          <button 
            key={mode} 
            onClick={() => setViewMode(mode)}
            style={{ 
              padding: "6px 16px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, textTransform: "capitalize", cursor: "pointer",
              background: viewMode === mode ? theme.activeBtnBg : "transparent",
              color: viewMode === mode ? theme.activeBtnText : theme.textSecondary,
              transition: "all 0.2s"
            }}
          >
            {mode}
          </button>
        ))}
      </div>
    </header>
  );

  // --- VIEW RENDERERS ---

  const renderTimeGrid = () => (
    <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}` }}>
      {Array.from({length: 24}).map((_, i) => (
        <div key={i} style={{ height: 60 * CONFIG.PIXELS_PER_MINUTE, position: "relative" }}>
          <span style={{ position: "absolute", top: -6, right: 8, fontSize: 11, color: theme.textSecondary, fontWeight: 500 }}>
             {settings.use24Hour ? `${i}:00` : `${i===0?12:i>12?i-12:i} ${i>=12?'PM':'AM'}`}
          </span>
        </div>
      ))}
    </div>
  );

  const renderDayColumn = (dateObj, isFullWeek = false) => {
    const isToday = DateUtils.isToday(dateObj);
    const isPast = settings.blurPast && DateUtils.isPast(dateObj) && !isToday;
    
    // Filter events for this day
    const dayEvts = events.filter(e => 
      e.start.getDate() === dateObj.getDate() && 
      e.start.getMonth() === dateObj.getMonth() &&
      e.start.getFullYear() === dateObj.getFullYear() &&
      activeTags.includes(e.category)
    );

    // Calculate overlapping layout logic would go here, simplified to simple overlap for this demo
    // Simple stacking logic handled by CSS z-index and width in a real engine
    
    return (
      <div 
        key={dateObj.toISOString()} 
        className={isPast ? "past-day-blur" : ""}
        style={{ 
          flex: 1, 
          borderRight: isFullWeek ? `1px solid ${theme.border}` : 'none', 
          position: "relative",
          background: isToday ? (settings.darkMode ? "#172033" : "#F0F9FF") : "transparent"
        }}
      >
        {/* Background Grid */}
        {Array.from({length: 24}).map((_, h) => (
          <div key={h} style={{ height: 60 * CONFIG.PIXELS_PER_MINUTE, borderBottom: `1px solid ${theme.gridLine}`, boxSizing: "border-box" }}></div>
        ))}

        {/* Current Time Indicator */}
        {isToday && (
          <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * CONFIG.PIXELS_PER_MINUTE, left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}>
            <div style={{ height: 2, background: theme.accent, position: "relative" }}>
              <div className="pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: theme.accent, position: "absolute", top: -4, left: -5 }} />
            </div>
          </div>
        )}

        {/* Click to Create Listener */}
        <div 
          className="abs-fill" 
          style={{ zIndex: 1 }}
          onClick={(e) => {
            if(dragData) return; // Don't trigger if dragging
            const rect = e.currentTarget.getBoundingClientRect();
            const offsetY = e.clientY - rect.top + e.currentTarget.scrollTop; 
            // In full app, correct for scroll parent. Here, simplified.
            // Actually, for this click to work precisely we need to use the native event offset from the day column container
            const clickY = e.nativeEvent.offsetY;
            const minutes = Math.floor(clickY / CONFIG.PIXELS_PER_MINUTE / CONFIG.SNAP_MINUTES) * CONFIG.SNAP_MINUTES;
            
            const start = new Date(dateObj);
            start.setHours(0, minutes, 0, 0);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 60);
            
            setEditingEvent(null);
            setModalOpen(true);
            // Pre-fill modal state (conceptually)
          }}
        />

        {/* Events */}
        {dayEvts.map(ev => {
          const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * CONFIG.PIXELS_PER_MINUTE;
          const duration = (ev.end - ev.start) / 60000;
          const height = Math.max(duration * CONFIG.PIXELS_PER_MINUTE, 24);
          const cat = settings.categories.find(c => c.id === ev.category) || settings.categories[0];
          const isDragging = dragData?.id === ev.id;
          
          return (
            <div
              key={ev.id}
              onMouseDown={(e) => handleDragStart(e, ev, 'move')}
              style={{
                position: "absolute",
                top: top,
                height: height,
                left: 4, right: 8,
                borderRadius: 4,
                background: settings.darkMode ? cat.bg : cat.bg,
                borderLeft: `3px solid ${cat.border}`,
                padding: "2px 6px",
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: isDragging ? 50 : 10,
                opacity: isDragging ? 0.8 : 1,
                boxShadow: isDragging ? theme.shadow : "none",
                overflow: "hidden",
                color: cat.text
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: "1.2" }}>{ev.title}</div>
              {height > 40 && <div style={{ fontSize: 10, opacity: 0.8 }}>{DateUtils.fmtTime(ev.start, settings.use24Hour)} - {DateUtils.fmtTime(ev.end, settings.use24Hour)}</div>}
              
              {/* Resize Handle */}
              <div 
                onMouseDown={(e) => handleDragStart(e, ev, 'resize')}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, cursor: "ns-resize" }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const YearView = () => {
    // Logic for linear year view: Header = Repeated Mo-Su, Rows = Months
    const daysHeader = settings.weekStartMon ? ["Mo","Tu","We","Th","Fr","Sa","Su"] : ["Su","Mo","Tu","We","Th","Fr","Sa"];
    
    return (
      <div className="fade-in" style={{ padding: 40, height: "100%", overflowY: "auto" }}>
        <div style={{ minWidth: 1000, maxWidth: 1400, margin: "0 auto" }}>
          
          {/* Header Row */}
          <div style={{ display: "flex", marginBottom: 16, marginLeft: 100 }}>
             {Array.from({length: CONFIG.YEAR_COLUMNS}).map((_, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase" }}>
                  {daysHeader[i % 7]}
                </div>
             ))}
          </div>

          {/* Months */}
          {Array.from({length: 12}).map((_, m) => {
            const monthStart = new Date(currentDate.getFullYear(), m, 1);
            const daysInMonth = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
            // Calculate Offset based on week start preference
            let startDay = monthStart.getDay(); 
            if (settings.weekStartMon) startDay = startDay === 0 ? 6 : startDay - 1;

            return (
              <div key={m} style={{ display: "flex", height: 40, marginBottom: 8, alignItems: "center" }}>
                <div className="font-heading" style={{ width: 100, fontSize: 14, fontWeight: 600, color: theme.accent }}>
                  {monthStart.toLocaleDateString('en-US',{month:'short'})}
                </div>
                
                <div style={{ flex: 1, display: "flex", gap: 4 }}>
                   {/* Cells */}
                   {Array.from({length: CONFIG.YEAR_COLUMNS}).map((_, col) => {
                      const dayNum = col - startDay + 1;
                      if (dayNum < 1 || dayNum > daysInMonth) return <div key={col} style={{ flex: 1 }} />;
                      
                      const date = new Date(currentDate.getFullYear(), m, dayNum);
                      const isT = DateUtils.isToday(date);
                      const hasEv = events.some(e => 
                        e.start.getDate() === dayNum && 
                        e.start.getMonth() === m && 
                        e.start.getFullYear() === currentDate.getFullYear() &&
                        activeTags.includes(e.category)
                      );

                      return (
                        <div 
                          key={col}
                          onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                          className="cursor-pointer"
                          style={{ 
                            flex: 1, borderRadius: 4, height: 32,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: isT ? 700 : 500,
                            background: isT ? theme.accent : hasEv ? (settings.darkMode ? "#1E293B" : "#DBEAFE") : "transparent",
                            color: isT ? "#fff" : hasEv ? (settings.darkMode ? "#60A5FA" : "#1E40AF") : theme.textSecondary,
                            border: isT ? `1px solid ${theme.accent}` : '1px solid transparent',
                            transition: "transform 0.1s"
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isT ? theme.accent : theme.border}
                          onMouseLeave={e => e.currentTarget.style.background = isT ? theme.accent : hasEv ? (settings.darkMode ? "#1E293B" : "#DBEAFE") : "transparent"}
                        >
                          {dayNum}
                        </div>
                      )
                   })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  // --- RENDER ---

  if (!user) {
    return (
      <div className="flex-center" style={{ height: "100vh", background: "#0B0E11", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <h1 className="font-heading" style={{ fontSize: 64, marginBottom: 24, background: "linear-gradient(to right, #3B82F6, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{APP_NAME}</h1>
          <button onClick={() => signInWithPopup(auth, provider)} style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, borderRadius: 12, border: "none", background: "#3B82F6", color: "#fff", cursor: "pointer" }}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      <Sidebar />
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header />
        
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {viewMode === 'day' && (
             <div style={{ display: "flex", minHeight: "100%" }}>
               {renderTimeGrid()}
               <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                 {renderDayColumn(currentDate)}
               </div>
             </div>
          )}

          {viewMode === 'week' && (
             <div style={{ display: "flex", minHeight: "100%" }}>
               {renderTimeGrid()}
               <div style={{ flex: 1, display: "flex" }}>
                  {DateUtils.getWeekDays(currentDate, settings.weekStartMon).map(d => (
                    <div key={d.toISOString()} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ height: 50, borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme.sidebar, position: "sticky", top: 0, zIndex: 20 }}>
                         <span style={{ fontSize: 11, fontWeight: 700, color: DateUtils.isToday(d) ? theme.accent : theme.textSecondary, textTransform: "uppercase" }}>{d.toLocaleDateString('en-US', {weekday:'short'})}</span>
                         <span style={{ fontSize: 18, fontWeight: 600, color: DateUtils.isToday(d) ? theme.accent : theme.text }}>{d.getDate()}</span>
                      </div>
                      {renderDayColumn(d, true)}
                    </div>
                  ))}
               </div>
             </div>
          )}

          {viewMode === 'year' && <YearView />}
        </div>
      </div>

      {/* --- FLOATING SETTINGS MODAL --- */}
      {showSettings && (
        <div className="flex-center fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100 }} onClick={() => setShowSettings(false)}>
          <div style={{ width: 400, background: theme.card, borderRadius: 24, padding: 32, boxShadow: theme.shadow, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
               <h3 className="font-heading" style={{ fontSize: 20, fontWeight: 700 }}>Settings</h3>
               <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", fontSize: 24, color: theme.textSecondary, cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, marginBottom: 8, display: "block" }}>Appearance</label>
              <div style={{ display: "flex", background: theme.bg, padding: 4, borderRadius: 12, border: `1px solid ${theme.border}` }}>
                 <button onClick={() => setSettings({...settings, darkMode: false})} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: !settings.darkMode ? theme.card : "transparent", color: !settings.darkMode ? theme.text : theme.textSecondary, fontWeight: 600, boxShadow: !settings.darkMode ? theme.shadow : "none", cursor: "pointer" }}>Light</button>
                 <button onClick={() => setSettings({...settings, darkMode: true})} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: settings.darkMode ? theme.card : "transparent", color: settings.darkMode ? theme.text : theme.textSecondary, fontWeight: 600, boxShadow: settings.darkMode ? theme.shadow : "none", cursor: "pointer" }}>Dark</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
               <div>
                 <div style={{ fontSize: 14, fontWeight: 600 }}>Blur Past Dates</div>
                 <div style={{ fontSize: 12, color: theme.textSecondary }}>Fade out previous days</div>
               </div>
               <div className={`toggle-switch ${settings.blurPast ? "active" : ""}`} onClick={() => setSettings({...settings, blurPast: !settings.blurPast})}>
                 <div className="toggle-knob" />
               </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
               <div>
                 <div style={{ fontSize: 14, fontWeight: 600 }}>Start on Monday</div>
                 <div style={{ fontSize: 12, color: theme.textSecondary }}>Week view alignment</div>
               </div>
               <div className={`toggle-switch ${settings.weekStartMon ? "active" : ""}`} onClick={() => setSettings({...settings, weekStartMon: !settings.weekStartMon})}>
                 <div className="toggle-knob" />
               </div>
            </div>
            
            <button onClick={() => signOut(auth)} style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #EF4444", color: "#EF4444", background: "transparent", fontWeight: 600, cursor: "pointer", marginTop: 12 }}>Sign Out</button>
          </div>
        </div>
      )}

      {/* --- EVENT FORM MODAL --- */}
      {modalOpen && (
        <div className="flex-center fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100 }} onClick={() => setModalOpen(false)}>
           <EventForm 
             event={editingEvent} 
             theme={theme} 
             categories={settings.categories} 
             onSave={handleSaveEvent} 
             onDelete={handleDeleteEvent} 
             onClose={() => setModalOpen(false)} 
           />
        </div>
      )}

      {/* --- TOASTS --- */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => (
           <div key={n.id} className="fade-in" style={{ padding: "12px 24px", background: n.type === 'error' ? "#EF4444" : "#10B981", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>{n.msg}</div>
        ))}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: EVENT FORM ---
function EventForm({ event, theme, categories, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [catId, setCatId] = useState(event?.category || categories[0].id);
  
  // Initialize times (default to next hour if new)
  const initStart = event?.start || new Date();
  if(!event) { initStart.setMinutes(0); initStart.setSeconds(0); initStart.setMilliseconds(0); initStart.setHours(initStart.getHours() + 1); }
  const initEnd = event?.end || new Date(initStart);
  if(!event) initEnd.setHours(initEnd.getHours() + 1);

  const [startTime, setStartTime] = useState(initStart.toTimeString().slice(0,5));
  const [endTime, setEndTime] = useState(initEnd.toTimeString().slice(0,5));

  const handleSubmit = () => {
    if(!title.trim()) return;
    const s = new Date(initStart);
    const [sh, sm] = startTime.split(':');
    s.setHours(parseInt(sh), parseInt(sm));

    const e = new Date(initStart);
    const [eh, em] = endTime.split(':');
    e.setHours(parseInt(eh), parseInt(em));
    
    // Handle overnight
    if(e <= s) e.setDate(e.getDate() + 1);

    onSave({ id: event?.id, title, category: catId, start: s, end: e });
  };

  return (
    <div style={{ width: 400, background: theme.card, padding: 32, borderRadius: 16, boxShadow: theme.shadow }} onClick={e => e.stopPropagation()}>
      <h3 className="font-heading" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: theme.text }}>{event ? "Edit Event" : "Create Event"}</h3>
      
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Title</label>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 16 }} placeholder="Event name..." />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
           <label style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Start</label>
           <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
        </div>
        <div style={{ flex: 1 }}>
           <label style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 8, display: "block" }}>End</label>
           <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Category</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
           {categories.map(c => (
             <button key={c.id} onClick={() => setCatId(c.id)} style={{ padding: "6px 12px", borderRadius: 20, border: catId === c.id ? `2px solid ${c.border}` : `1px solid ${theme.border}`, background: catId === c.id ? c.bg : "transparent", color: catId === c.id ? c.text : theme.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c.name}</button>
           ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
         {event && <button onClick={() => onDelete(event.id)} style={{ marginRight: "auto", color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>}
         <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: theme.bg, color: theme.text, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
         <button onClick={handleSubmit} style={{ padding: "10px 24px", borderRadius: 8, background: theme.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
      </div>
    </div>
  );
}