import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CONFIGURATION & GEOMETRY
// ==========================================

const CONFIG = {
  APP_NAME: "Timeline",
  HOUR_HEIGHT: 80, // Taller rows for better precision
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 90,
  SNAP: 15
};

const THEME = {
  // Midnight Obsidian Palette (Matches Screenshot 1)
  bg: "#050505", 
  sidebar: "#0A0A0A", 
  card: "#121212",
  border: "#1F1F1F",
  text: "#FFFFFF",
  textSec: "#A1A1AA", // Zinc 400
  accent: "#3B82F6", // Electric Blue
  accentGlow: "rgba(59, 130, 246, 0.5)",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  gridLine: "#1F1F1F",
  glass: "rgba(20, 20, 20, 0.8)"
};

// ==========================================
// 2. CSS & GLOBAL STYLES
// ==========================================

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@500&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-font-smoothing: antialiased; }
  body { font-family: 'Inter', sans-serif; background: ${THEME.bg}; color: ${THEME.text}; overflow: hidden; }
  h1, h2, h3, .serif { font-family: 'Playfair Display', serif; }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #444; }

  /* Utilities */
  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  .glass { background: ${THEME.glass}; backdrop-filter: blur(24px); border: 1px solid ${THEME.border}; }
  
  .btn { cursor: pointer; transition: all 0.2s; border: none; background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; }
  .btn:hover { opacity: 0.8; transform: translateY(-1px); }
  .btn:active { transform: scale(0.98); }

  /* Week View Grid */
  .time-slot { height: ${CONFIG.HOUR_HEIGHT}px; border-bottom: 1px solid ${THEME.gridLine}; position: relative; }
  .time-label { position: absolute; top: -10px; right: 12px; font-size: 11px; color: ${THEME.textSec}; font-family: 'Inter'; font-weight: 500; }
  
  /* Events */
  .event-card { position: absolute; border-radius: 6px; padding: 8px 12px; overflow: hidden; border-left: 3px solid; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
  .event-card:hover { z-index: 50; transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }

  /* Sidebar Widgets (Matches Screenshot) */
  .widget { background: #121212; border: 1px solid #1F1F1F; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  .progress-track { height: 6px; background: #27272a; border-radius: 3px; overflow: hidden; margin-top: 12px; }
  .progress-fill { height: 100%; border-radius: 3px; }

  /* Settings Modal (Matches Screenshot) */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
  .modal-content { width: 420px; background: #fff; border-radius: 24px; padding: 32px; color: #000; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
  
  .segmented-control { display: flex; background: #F4F4F5; padding: 4px; border-radius: 12px; margin-bottom: 24px; }
  .segment-btn { flex: 1; padding: 8px; text-align: center; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; color: #71717A; }
  .segment-btn.active { background: #fff; color: #000; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; }

  .toggle-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .toggle-switch { width: 48px; height: 28px; background: #E4E4E7; border-radius: 14px; position: relative; cursor: pointer; transition: 0.3s; }
  .toggle-switch.active { background: #3B82F6; }
  .toggle-thumb { width: 24px; height: 24px; background: #fff; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  .toggle-switch.active .toggle-thumb { transform: translateX(20px); }
`;

// ==========================================
// 3. MAIN LOGIC
// ==========================================

export default function TimelineArchitect() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week"); // Default to Week to show fix
  
  // Settings
  const [config, setConfig] = useState({ theme: 'dark', blurPast: true, weekStartMon: true, use24h: false });
  
  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const scrollRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    return auth.onAuthStateChanged(u => { setUser(u); if(u) loadEvents(u); });
  }, []);

  // Scroll to 8 AM on load
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * CONFIG.HOUR_HEIGHT;
  }, [view]);

  // --- DATA ---
  const loadEvents = async (u) => {
    const q = query(collection(db, "events"), where("uid", "==", u.uid));
    const snap = await getDocs(q);
    setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
  };

  const saveEvent = async (data) => {
    const payload = {
      uid: user.uid, title: data.title, category: data.category,
      startTime: Timestamp.fromDate(data.start), endTime: Timestamp.fromDate(data.end),
      deleted: false
    };
    if (data.id) await updateDoc(doc(db, "events", data.id), payload);
    else await addDoc(collection(db, "events"), payload);
    setModalOpen(false); loadEvents(user);
  };

  const nav = (d) => {
    const next = new Date(currentDate);
    if(view === 'week') next.setDate(next.getDate() + (d * 7));
    else next.setDate(next.getDate() + d);
    setCurrentDate(next);
  };

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar user={user} openSettings={() => setSettingsOpen(true)} onNew={() => { setEditingEvent(null); setModalOpen(true); }} />
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: THEME.bg }}>
        {/* Header */}
        <header style={{ height: CONFIG.HEADER_HEIGHT, borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <div>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, color: THEME.text, marginBottom: 4 }}>
              {currentDate.toLocaleString('default', { month: 'long' })} <span style={{color: THEME.textSec}}>{currentDate.getFullYear()}</span>
            </h1>
            <div style={{ fontSize: 13, color: THEME.textSec, fontStyle: "italic" }}>"One step at a time."</div>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div className="glass" style={{ padding: 4, borderRadius: 12, display: "flex" }}>
              {['Day', 'Week', 'Month', 'Year'].map(v => (
                <button key={v} onClick={() => setView(v.toLowerCase())} className="btn" style={{ padding: "8px 24px", borderRadius: 8, background: view === v.toLowerCase() ? THEME.accent : "transparent", color: view === v.toLowerCase() ? "#fff" : THEME.textSec, fontSize: 13, fontWeight: 600 }}>{v}</button>
              ))}
            </div>
            <div className="glass" style={{ display: "flex", alignItems: "center", borderRadius: 12, padding: "0 4px" }}>
              <button onClick={() => nav(-1)} className="btn" style={{ width: 36, height: 36, color: THEME.text }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} className="btn" style={{ padding: "0 12px", fontSize: 13, fontWeight: 600, color: THEME.text }}>Today</button>
              <button onClick={() => nav(1)} className="btn" style={{ width: 36, height: 36, color: THEME.text }}>→</button>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {view === 'week' && <WeekView currentDate={currentDate} events={events} onEdit={(ev) => { setEditingEvent(ev); setModalOpen(true); }} config={config} />}
          {view === 'day' && <DayView currentDate={currentDate} events={events} onEdit={(ev) => { setEditingEvent(ev); setModalOpen(true); }} />}
        </div>
      </div>

      {/* Modals */}
      {settingsOpen && <SettingsModal config={config} setConfig={setConfig} onClose={() => setSettingsOpen(false)} onSignOut={() => signOut(auth)} />}
      {modalOpen && <EventModal event={editingEvent} onSave={saveEvent} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ==========================================
// 4. PRECISE WEEK VIEW ENGINE
// ==========================================

function WeekView({ currentDate, events, onEdit, config }) {
  // 1. Calculate Week Days
  const start = new Date(currentDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
  const weekDays = Array.from({length: 7}, (_, i) => { const d = new Date(start); d.setDate(diff + i); return d; });

  // 2. Helper to get pixel position from date
  const getPos = (date) => {
    const mins = date.getHours() * 60 + date.getMinutes();
    return mins * (CONFIG.HOUR_HEIGHT / 60);
  };

  return (
    <div style={{ display: "flex", minHeight: "100%", paddingTop: 20 }}>
      {/* Time Spine */}
      <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${THEME.border}` }}>
        {Array.from({length: 24}).map((_, h) => (
          <div key={h} className="time-slot">
            <span className="time-label">{config.use24h ? `${h}:00` : `${h%12||12} ${h<12?'AM':'PM'}`}</span>
          </div>
        ))}
      </div>

      {/* Days Columns */}
      <div style={{ flex: 1, display: "flex" }}>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());

          return (
            <div key={i} style={{ flex: 1, borderRight: `1px solid ${THEME.border}`, position: "relative", minWidth: 140 }}>
              {/* Header */}
              <div style={{ height: 60, borderBottom: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, background: THEME.bg, zIndex: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? THEME.accent : THEME.textSec, textTransform: "uppercase", letterSpacing: 1 }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</span>
                <span style={{ fontSize: 20, fontWeight: 600, color: isToday ? THEME.accent : THEME.text, marginTop: 4 }}>{d.getDate()}</span>
              </div>

              {/* Grid Lines */}
              {Array.from({length: 24}).map((_, h) => <div key={h} className="time-slot" />)}

              {/* Current Time Line */}
              {isToday && (
                <div style={{ position: "absolute", top: getPos(new Date()) + 60, left: 0, right: 0, height: 2, background: THEME.accent, zIndex: 20 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: THEME.accent, position: "absolute", left: -5, top: -4 }} />
                </div>
              )}

              {/* Events (Absolute Positioning) */}
              {dayEvents.map(ev => {
                const top = getPos(ev.start);
                const height = getPos(ev.end) - top;
                const catColor = ev.category === 'work' ? "#3B82F6" : ev.category === 'family' ? "#10B981" : "#F59E0B";
                
                return (
                  <div 
                    key={ev.id}
                    onClick={() => onEdit(ev)}
                    className="event-card fade-in"
                    style={{
                      top: top + 60, // Offset for header
                      height: Math.max(height, 24),
                      left: 4, right: 4,
                      background: `${catColor}20`,
                      borderColor: catColor,
                      color: "#fff"
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
                    {height > 40 && <div style={{ fontSize: 10, opacity: 0.7 }}>{ev.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 5. SIDEBAR & WIDGETS
// ==========================================

function Sidebar({ user, openSettings, onNew }) {
  return (
    <aside style={{ width: CONFIG.SIDEBAR_WIDTH, background: THEME.sidebar, borderRight: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column", padding: 24, zIndex: 50, overflowY: "auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, color: THEME.text }}>Timeline.</h1>
        <div style={{ fontSize: 13, color: THEME.textSec, marginTop: 4 }}>Welcome, <span style={{color: THEME.accent}}>{user.displayName?.split(" ")[0]}</span></div>
      </div>

      <button onClick={onNew} className="btn" style={{ width: "100%", padding: "14px", borderRadius: 12, background: THEME.accent, color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)", marginBottom: 32 }}>
        <span style={{marginRight: 8}}>+</span> New Event
      </button>

      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textSec, letterSpacing: 1, marginBottom: 16 }}>LIFE OS</div>

      {/* Habits Widget (Screenshot Match) */}
      <div className="widget">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Habits
          </div>
          <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>High Perf</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "#A1A1AA" }}>
          <span>Workout</span>
          <span>12 day streak</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#A1A1AA" }}>
          <span>Reading</span>
          <span>5 day streak</span>
        </div>
      </div>

      {/* Budget Widget (Screenshot Match) */}
      <div className="widget">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Monthly Budget
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>41%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: "41%", background: "#10B981" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#71717A", marginTop: 8 }}>
          <span>$1240 spent</span>
          <span>$3000 limit</span>
        </div>
      </div>

      <div style={{ marginTop: "auto", borderTop: `1px solid ${THEME.border}`, paddingTop: 20 }}>
        <button onClick={openSettings} className="btn" style={{ width: "100%", justifyContent: "flex-start", gap: 12, padding: "10px", borderRadius: 8, color: THEME.textSec }}>
          <ICONS.Settings /> Preferences
        </button>
      </div>
    </aside>
  );
}

// ==========================================
// 6. SETTINGS MODAL (Screenshot Match)
// ==========================================

function SettingsModal({ config, setConfig, onClose, onSignOut }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 className="serif" style={{ fontSize: 24, fontWeight: 600 }}>Settings</h2>
          <button onClick={onClose} className="btn" style={{ fontSize: 24, color: "#999" }}>&times;</button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 12 }}>Theme</label>
          <div className="segmented-control">
            <div className={`segment-btn ${!config.darkMode ? 'active' : ''}`} onClick={() => setConfig({...config, darkMode: false})}>☀ Light</div>
            <div className={`segment-btn ${config.darkMode ? 'active' : ''}`} onClick={() => setConfig({...config, darkMode: true})}>☾ Dark</div>
          </div>
        </div>

        <div className="toggle-row">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Blur Past Dates</div>
            <div style={{ fontSize: 12, color: "#71717A" }}>Fade old days</div>
          </div>
          <div className={`toggle-switch ${config.blurPast ? 'active' : ''}`} onClick={() => setConfig({...config, blurPast: !config.blurPast})}>
            <div className="toggle-thumb" />
          </div>
        </div>

        <div className="toggle-row">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Week Starts On</div>
            <div style={{ fontSize: 12, color: "#71717A" }}>Adjust calendar alignment</div>
          </div>
          <div className="segmented-control" style={{ width: 140, marginBottom: 0 }}>
             <div className={`segment-btn ${!config.weekStartMon ? 'active' : ''}`} onClick={() => setConfig({...config, weekStartMon: false})}>Sun</div>
             <div className={`segment-btn ${config.weekStartMon ? 'active' : ''}`} onClick={() => setConfig({...config, weekStartMon: true})}>Mon</div>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <button onClick={onSignOut} className="btn" style={{ width: "100%", padding: "14px", border: "1px solid #EF4444", color: "#EF4444", borderRadius: 12, fontWeight: 600 }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. EVENT MODAL
// ==========================================

function EventModal({ event, onSave, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [start, setStart] = useState(event?.start ? event.start.toTimeString().slice(0,5) : "09:00");
  const [end, setEnd] = useState(event?.end ? event.end.toTimeString().slice(0,5) : "10:00");
  const [cat, setCat] = useState(event?.category || "work");

  const handleSubmit = () => {
    const s = new Date(); const [sh, sm] = start.split(':'); s.setHours(sh, sm);
    const e = new Date(); const [eh, em] = end.split(':'); e.setHours(eh, em);
    onSave({ id: event?.id, title, category: cat, start: s, end: e });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: THEME.card, color: "#fff" }}>
        <h2 className="serif" style={{ marginBottom: 24, fontSize: 24 }}>{event ? "Edit Event" : "New Event"}</h2>
        <input autoFocus className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ width: "100%", padding: 14, background: "#1F1F1F", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input type="time" value={start} onChange={e => setStart(e.target.value)} style={{ flex: 1, padding: 12, background: "#1F1F1F", border: "none", borderRadius: 12, color: "#fff" }} />
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={{ flex: 1, padding: 12, background: "#1F1F1F", border: "none", borderRadius: 12, color: "#fff" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {['work', 'family', 'health'].map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "8px 16px", borderRadius: 20, background: cat === c ? THEME.accent : "#1F1F1F", color: "#fff", border: "none", textTransform: "capitalize" }}>{c}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} className="btn" style={{ padding: "12px 24px", color: "#A1A1AA" }}>Cancel</button>
          <button onClick={handleSubmit} className="btn" style={{ padding: "12px 32px", background: THEME.accent, color: "#fff", borderRadius: 12, fontWeight: 600 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. DAY VIEW (Manifesto)
// ==========================================

function DayView({ currentDate, events, onEdit }) {
  const dEvents = events.filter(e => e.start.toDateString() === currentDate.toDateString()).sort((a,b) => a.start - b.start);
  
  return (
    <div className="fade-in" style={{ padding: "40px 80px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: THEME.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{currentDate.toLocaleDateString('en-US', {weekday:'long'})}</div>
        <h1 className="serif" style={{ fontSize: 56, color: THEME.text }}>Today's Agenda</h1>
      </div>
      
      <div style={{ position: "relative", borderLeft: `1px solid ${THEME.border}`, paddingLeft: 40 }}>
        {Array.from({length: 16}).map((_, i) => {
          const h = i + 6; // Start 6 AM
          const slotEvents = dEvents.filter(e => e.start.getHours() === h);
          return (
            <div key={h} style={{ minHeight: 80, position: "relative", paddingBottom: 20 }}>
              <div className="serif" style={{ position: "absolute", left: -100, top: -8, color: THEME.textSec, width: 50, textAlign: "right", fontStyle: "italic" }}>{h % 12 || 12} {h < 12 ? 'AM' : 'PM'}</div>
              <div style={{ position: "absolute", left: -46, top: 4, width: 11, height: 11, borderRadius: "50%", background: THEME.bg, border: `2px solid ${THEME.border}` }} />
              
              {slotEvents.map(ev => (
                <div key={ev.id} onClick={() => onEdit(ev)} className="event-card" style={{ position: "relative", marginBottom: 12, width: "100%", background: "#1F1F1F", borderLeftColor: THEME.accent }}>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Playfair Display' }}>{ev.title}</div>
                  <div style={{ fontSize: 13, color: THEME.textSec, marginTop: 4 }}>{ev.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} — {ev.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 9. AUTH SCREEN
// ==========================================

function AuthScreen({ onLogin }) {
  return (
    <div style={{ height: "100vh", background: THEME.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 className="serif" style={{ fontSize: 64, color: THEME.text, marginBottom: 24 }}>Timeline.</h1>
      <p style={{ color: THEME.textSec, marginBottom: 40, fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 18 }}>"Time is the luxury you cannot buy."</p>
      <button onClick={onLogin} className="btn" style={{ padding: "16px 40px", borderRadius: 4, background: THEME.accent, color: "#fff", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Enter System</button>
    </div>
  );
}