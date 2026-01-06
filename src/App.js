import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. SYSTEM CONSTANTS & CONFIGURATION
// ==========================================

const CONFIG = {
  APP_NAME: "Timeline OS",
  VERSION: "7.0.0-Singularity",
  THEME: {
    bg: "#050505",
    sidebar: "#0A0A0A",
    card: "#121212",
    border: "#222222",
    text: "#E5E5E5",
    textDim: "#737373",
    accent: "#3B82F6", // International Klein Blue
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    glass: "rgba(10, 10, 10, 0.8)",
    fontDisplay: '"Playfair Display", serif',
    fontUI: '"Inter", -apple-system, sans-serif'
  },
  LAYOUT: {
    SIDEBAR_WIDTH: 320,
    HEADER_HEIGHT: 80,
    HOUR_HEIGHT: 80, // High-DPI vertical spacing
    SNAP_MINUTES: 15
  }
};

const ICONS = {
  Grid: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Dollar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  ChevronLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --bg: ${CONFIG.THEME.bg};
    --sidebar: ${CONFIG.THEME.sidebar};
    --card: ${CONFIG.THEME.card};
    --border: ${CONFIG.THEME.border};
    --text: ${CONFIG.THEME.text};
    --text-dim: ${CONFIG.THEME.textDim};
    --accent: ${CONFIG.THEME.accent};
  }

  * { box-sizing: border-box; outline: none; }
  body { background: var(--bg); color: var(--text); font-family: ${CONFIG.THEME.fontUI}; overflow: hidden; margin: 0; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, .serif { font-family: ${CONFIG.THEME.fontDisplay}; }
  .mono { font-family: 'JetBrains Mono', monospace; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #444; }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  .glass-panel { background: ${CONFIG.THEME.glass}; backdrop-filter: blur(24px); border: 1px solid var(--border); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
  
  .btn-reset { border: none; background: transparent; cursor: pointer; color: inherit; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .btn-hover:hover { opacity: 0.8; transform: translateY(-1px); }
  
  .time-grid-line { height: ${CONFIG.LAYOUT.HOUR_HEIGHT}px; border-bottom: 1px solid var(--border); position: relative; }
  .time-label { position: absolute; top: -10px; right: 12px; font-size: 11px; color: var(--text-dim); font-weight: 500; font-family: 'Inter'; }
  
  .event-card { position: absolute; border-radius: 4px; padding: 4px 8px; font-size: 12px; overflow: hidden; border-left: 3px solid; cursor: pointer; transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .event-card:hover { z-index: 50; transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }

  .switch { width: 44px; height: 24px; background: #333; border-radius: 12px; position: relative; cursor: pointer; transition: 0.3s; }
  .switch.active { background: var(--accent); }
  .switch-thumb { width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s; }
  .switch.active .switch-thumb { transform: translateX(20px); }
  
  .segmented { display: flex; background: #1a1a1a; padding: 4px; border-radius: 8px; }
  .segment-opt { flex: 1; text-align: center; padding: 6px; font-size: 12px; cursor: pointer; border-radius: 6px; color: #777; transition: 0.2s; }
  .segment-opt.active { background: #333; color: #fff; font-weight: 600; }
`;

// ==========================================
// 3. MAIN APPLICATION LOGIC
// ==========================================

export default function TimelineOS() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("week");
  const [date, setDate] = useState(new Date());
  
  // Settings & State
  const [config, setConfig] = useState({ theme: 'dark', weekStartMon: true, use24h: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [tags, setTags] = useState([
    { id: 'work', name: 'Work', color: '#3B82F6' },
    { id: 'personal', name: 'Personal', color: '#10B981' },
    { id: 'deep', name: 'Deep Work', color: '#8B5CF6' },
    { id: 'urgent', name: 'Urgent', color: '#EF4444' }
  ]);

  const scrollRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    return auth.onAuthStateChanged(u => { setUser(u); if(u) loadData(u.uid); });
  }, []);

  // Scroll to 8 AM
  useEffect(() => {
    if (scrollRef.current && (view === 'week' || view === 'day')) {
      scrollRef.current.scrollTop = 8 * CONFIG.LAYOUT.HOUR_HEIGHT;
    }
  }, [view]);

  // --- DATA ENGINE ---
  const loadData = async (uid) => {
    const q = query(collection(db, "events"), where("uid", "==", uid), where("deleted", "==", false));
    const snap = await getDocs(q);
    setEvents(snap.docs.map(d => ({ 
      id: d.id, ...d.data(), 
      start: d.data().startTime.toDate(), 
      end: d.data().endTime.toDate() 
    })));
  };

  const saveEvent = async (data) => {
    const payload = {
      uid: user.uid, ...data,
      startTime: Timestamp.fromDate(data.start),
      endTime: Timestamp.fromDate(data.end),
      deleted: false, updatedAt: serverTimestamp()
    };
    if (data.id) await updateDoc(doc(db, "events", data.id), payload);
    else await addDoc(collection(db, "events"), payload);
    setModalOpen(false); loadData(user.uid);
  };

  const deleteEvent = async (id) => {
    await updateDoc(doc(db, "events", id), { deleted: true });
    setModalOpen(false); loadData(user.uid);
  };

  const nav = (dir) => {
    const d = new Date(date);
    if(view === 'week') d.setDate(d.getDate() + (dir * 7));
    else if(view === 'year') d.setFullYear(d.getFullYear() + dir);
    else d.setDate(d.getDate() + dir);
    setDate(d);
  };

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* SIDEBAR */}
      <Sidebar 
        user={user} 
        openSettings={() => setSettingsOpen(true)} 
        onNew={() => { setEditingEvent(null); setModalOpen(true); }}
        date={date}
        setDate={setDate}
      />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: CONFIG.THEME.bg }}>
        
        {/* Header */}
        <header style={{ height: CONFIG.LAYOUT.HEADER_HEIGHT, borderBottom: `1px solid ${CONFIG.THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <div>
            <h1 className="serif" style={{ fontSize: 32, color: CONFIG.THEME.text, marginBottom: 4 }}>
              {date.toLocaleString('default', { month: 'long' })} <span style={{color: CONFIG.THEME.textDim}}>{date.getFullYear()}</span>
            </h1>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
             <div className="segmented">
                {['Day', 'Week', 'Year'].map(v => (
                  <div key={v} onClick={() => setView(v.toLowerCase())} className={`segment-opt ${view === v.toLowerCase() ? 'active' : ''}`} style={{minWidth: 60}}>
                    {v}
                  </div>
                ))}
             </div>
             <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => nav(-1)} className="btn-reset btn-hover" style={{width: 32, height: 32, borderRadius: '50%', border: `1px solid ${CONFIG.THEME.border}`}}><ICONS.ChevronLeft/></button>
                <button onClick={() => setDate(new Date())} className="btn-reset btn-hover" style={{padding: "0 12px", borderRadius: 16, border: `1px solid ${CONFIG.THEME.border}`, fontSize: 13}}>Today</button>
                <button onClick={() => nav(1)} className="btn-reset btn-hover" style={{width: 32, height: 32, borderRadius: '50%', border: `1px solid ${CONFIG.THEME.border}`}}><ICONS.ChevronRight/></button>
             </div>
          </div>
        </header>

        {/* Viewport */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {view === 'week' && <WeekView date={date} events={events} onEdit={(e) => { setEditingEvent(e); setModalOpen(true); }} config={config} tags={tags} />}
          {view === 'day' && <DayView date={date} events={events} onEdit={(e) => { setEditingEvent(e); setModalOpen(true); }} tags={tags} />}
          {view === 'year' && <YearView date={date} events={events} setDate={setDate} setView={setView} />}
        </div>
      </div>

      {/* MODALS */}
      {modalOpen && <EventModal event={editingEvent} tags={tags} onSave={saveEvent} onDelete={deleteEvent} onClose={() => setModalOpen(false)} />}
      {settingsOpen && <SettingsModal config={config} setConfig={setConfig} tags={tags} setTags={setTags} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

// ==========================================
// 4. PRECISION WEEK ENGINE
// ==========================================

function WeekView({ date, events, onEdit, config, tags }) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
  const weekDays = Array.from({length: 7}, (_, i) => { const d = new Date(start); d.setDate(diff + i); return d; });

  const getPos = (d) => (d.getHours() * 60 + d.getMinutes()) * (CONFIG.LAYOUT.HOUR_HEIGHT / 60);

  return (
    <div style={{ display: "flex", minHeight: "100%", paddingTop: 20 }}>
      {/* Time Spine */}
      <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${CONFIG.THEME.border}` }}>
        {Array.from({length: 24}).map((_, h) => (
          <div key={h} className="time-grid-line">
            <span className="time-label">{config.use24h ? `${h}:00` : `${h%12||12} ${h<12?'AM':'PM'}`}</span>
          </div>
        ))}
      </div>

      {/* Days */}
      <div style={{ flex: 1, display: "flex" }}>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          const dEvents = events.filter(e => e.start.toDateString() === d.toDateString());
          
          return (
            <div key={i} style={{ flex: 1, borderRight: `1px solid ${CONFIG.THEME.border}`, position: "relative", minWidth: 140 }}>
              {/* Header */}
              <div style={{ height: 60, borderBottom: `1px solid ${CONFIG.THEME.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, background: CONFIG.THEME.bg, zIndex: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? CONFIG.THEME.accent : CONFIG.THEME.textDim, textTransform: "uppercase" }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</span>
                <span style={{ fontSize: 20, fontWeight: 600, color: isToday ? CONFIG.THEME.accent : CONFIG.THEME.text, marginTop: 4 }}>{d.getDate()}</span>
              </div>

              {/* Grid */}
              {Array.from({length: 24}).map((_, h) => <div key={h} className="time-grid-line" />)}

              {/* Events */}
              {dEvents.map(ev => {
                const top = getPos(ev.start);
                const height = getPos(ev.end) - top;
                const tag = tags.find(t => t.id === ev.category) || tags[0];
                return (
                  <div key={ev.id} onClick={() => onEdit(ev)} className="event-card"
                    style={{ 
                      top: top + 60, height: Math.max(height, 28), left: 4, right: 4, 
                      background: tag.color + '20', borderColor: tag.color, color: '#fff' 
                    }}>
                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
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

function Sidebar({ user, openSettings, onNew, date, setDate }) {
  return (
    <aside style={{ width: CONFIG.LAYOUT.SIDEBAR_WIDTH, background: CONFIG.THEME.sidebar, borderRight: `1px solid ${CONFIG.THEME.border}`, display: "flex", flexDirection: "column", padding: 24, zIndex: 50, overflowY: "auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, color: CONFIG.THEME.text }}>Timeline.</h1>
        <div style={{ fontSize: 13, color: CONFIG.THEME.textDim, marginTop: 4 }}>Welcome, <span style={{color: CONFIG.THEME.accent}}>{user.displayName?.split(" ")[0] || "User"}</span></div>
      </div>

      <button onClick={onNew} className="btn-reset btn-hover" style={{ width: "100%", padding: "14px", borderRadius: 12, background: CONFIG.THEME.accent, color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)", marginBottom: 32 }}>
        <span style={{marginRight: 8}}><ICONS.Plus/></span> New Event
      </button>

      {/* Mini Calendar */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${CONFIG.THEME.border}` }}>
        <MiniCalendar date={date} setDate={setDate} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: CONFIG.THEME.textDim, letterSpacing: 1, marginBottom: 16 }}>LIFE OS</div>

      {/* Habits Widget */}
      <div style={{ background: CONFIG.THEME.card, border: `1px solid ${CONFIG.THEME.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><ICONS.Activity /> Habits</div>
          <span style={{ fontSize: 11, color: CONFIG.THEME.warning, fontWeight: 600 }}>High Perf</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: CONFIG.THEME.textDim }}>
          <span>Workout</span><span>12 day streak</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: CONFIG.THEME.textDim }}>
          <span>Reading</span><span>5 day streak</span>
        </div>
      </div>

      {/* Budget Widget */}
      <div style={{ background: CONFIG.THEME.card, border: `1px solid ${CONFIG.THEME.border}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><ICONS.Dollar /> Budget</div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>41%</span>
        </div>
        <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: "41%", background: CONFIG.THEME.success }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: CONFIG.THEME.textDim, marginTop: 8 }}>
          <span>$1240 spent</span><span>$3000 limit</span>
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <button onClick={openSettings} className="btn-reset btn-hover" style={{ width: "100%", justifyContent: "flex-start", gap: 12, padding: "12px", borderRadius: 8, color: CONFIG.THEME.textDim, fontSize: 14 }}>
          <ICONS.Settings /> Preferences
        </button>
      </div>
    </aside>
  );
}

function MiniCalendar({ date, setDate }) {
  const days = ["S","M","T","W","T","F","S"];
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = startOfMonth.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{date.toLocaleString('default', {month:'long'})}</span>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()-1, 1))} className="btn-reset" style={{color: CONFIG.THEME.textDim}}><ICONS.ChevronLeft/></button>
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()+1, 1))} className="btn-reset" style={{color: CONFIG.THEME.textDim}}><ICONS.ChevronRight/></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
        {days.map(d => <div key={d} style={{fontSize:10, color:CONFIG.THEME.textDim}}>{d}</div>)}
        {Array.from({length:startDay}).map((_,i) => <div key={`e-${i}`} />)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const d = i+1;
          const isSelected = date.getDate() === d;
          return (
            <div key={d} onClick={() => setDate(new Date(date.getFullYear(), date.getMonth(), d))}
              style={{ fontSize: 12, padding: 6, borderRadius: 6, cursor: 'pointer', background: isSelected ? CONFIG.THEME.accent : 'transparent', color: isSelected ? '#fff' : CONFIG.THEME.textDim }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  );
}

// ==========================================
// 6. SETTINGS & EDITORS
// ==========================================

function SettingsModal({ config, setConfig, onClose, tags, setTags }) {
  const [newTagName, setNewTagName] = useState("");
  const addTag = () => {
    if(!newTagName.trim()) return;
    setTags([...tags, { id: newTagName.toLowerCase(), name: newTagName, color: "#888" }]);
    setNewTagName("");
  };

  return (
    <div className="glass-panel" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, background: CONFIG.THEME.card, padding: 32, borderRadius: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
          <h2 className="serif" style={{ fontSize: 24 }}>Settings</h2>
          <button onClick={onClose} className="btn-reset"><ICONS.Close/></button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Appearance</div>
          <div className="segmented">
            <div className={`segment-opt ${!config.darkMode ? 'active' : ''}`} onClick={() => setConfig({...config, darkMode: false})}>Light</div>
            <div className={`segment-opt ${config.darkMode ? 'active' : ''}`} onClick={() => setConfig({...config, darkMode: true})}>Dark</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div><div style={{fontSize:14, fontWeight:600}}>Blur Past Dates</div><div style={{fontSize:12, color:CONFIG.THEME.textDim}}>Fade out old events</div></div>
          <div className={`switch ${config.blurPast?'active':''}`} onClick={() => setConfig({...config, blurPast:!config.blurPast})}><div className="switch-thumb"/></div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Tags</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="New Tag Name" className="input-luxe" style={{flex:1, padding:10, borderRadius:8, background: CONFIG.THEME.bg, border: `1px solid ${CONFIG.THEME.border}`, color: CONFIG.THEME.text}} />
            <button onClick={addTag} style={{padding:"0 16px", borderRadius:8, background: CONFIG.THEME.accent, color:"#fff", border:"none", fontWeight:600}}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tags.map(t => (
               <div key={t.id} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 12, background: CONFIG.THEME.bg, border: `1px solid ${CONFIG.THEME.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                 <div style={{width:8, height:8, borderRadius:"50%", background: t.color}}/> {t.name}
                 <span onClick={() => setTags(tags.filter(tag => tag.id !== t.id))} style={{cursor:"pointer", marginLeft:4}}>×</span>
               </div>
            ))}
          </div>
        </div>

        <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "14px", border: `1px solid ${CONFIG.THEME.danger}`, color: CONFIG.THEME.danger, background: "transparent", borderRadius: 12, fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
      </div>
    </div>
  );
}

function EventModal({ event, tags, onSave, onDelete, onClose }) {
  const [data, setData] = useState({ 
    title: event?.title || "", 
    category: event?.category || tags[0].id, 
    start: event?.start ? event.start.toTimeString().slice(0,5) : "09:00",
    end: event?.end ? event.end.toTimeString().slice(0,5) : "10:00"
  });

  const handleSubmit = () => {
    const s = new Date(); const [sh, sm] = data.start.split(':'); s.setHours(sh, sm);
    const e = new Date(); const [eh, em] = data.end.split(':'); e.setHours(eh, em);
    onSave({ id: event?.id, ...data, start: s, end: e });
  };

  return (
    <div className="glass-panel" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, background: CONFIG.THEME.card, padding: 32, borderRadius: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>{event ? "Edit Event" : "Create Event"}</h2>
        <input autoFocus value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="Title" style={{ width: "100%", padding: 14, background: CONFIG.THEME.bg, border: `1px solid ${CONFIG.THEME.border}`, borderRadius: 12, color: CONFIG.THEME.text, fontSize: 16, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} style={{ flex: 1, padding: 12, background: CONFIG.THEME.bg, border: `1px solid ${CONFIG.THEME.border}`, borderRadius: 12, color: CONFIG.THEME.text }} />
          <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} style={{ flex: 1, padding: 12, background: CONFIG.THEME.bg, border: `1px solid ${CONFIG.THEME.border}`, borderRadius: 12, color: CONFIG.THEME.text }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {tags.map(t => (
            <button key={t.id} onClick={() => setData({...data, category: t.id})} style={{ padding: "8px 16px", borderRadius: 20, background: data.category === t.id ? CONFIG.THEME.accent : CONFIG.THEME.bg, color: "#fff", border: "none", fontSize: 12 }}>{t.name}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          {event && <button onClick={() => onDelete(event.id)} className="btn-reset" style={{color: CONFIG.THEME.danger, marginRight: 'auto'}}>Delete</button>}
          <button onClick={onClose} className="btn-reset" style={{color: CONFIG.THEME.textDim}}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: "12px 32px", background: CONFIG.THEME.accent, color: "#fff", borderRadius: 12, border: "none", fontWeight: 600, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DayView({ date, events, onEdit, tags }) {
  return (
    <div className="fade-in" style={{ padding: "40px 60px", maxWidth: 800, margin: "0 auto" }}>
      <h1 className="serif" style={{ fontSize: 48, marginBottom: 40 }}>Today's Agenda</h1>
      <div style={{ position: "relative", borderLeft: `1px solid ${CONFIG.THEME.border}`, paddingLeft: 40 }}>
        {Array.from({length: 16}).map((_, i) => {
          const h = i + 6; 
          const slotEvents = events.filter(e => e.start.toDateString() === date.toDateString() && e.start.getHours() === h);
          return (
            <div key={h} style={{ minHeight: 80, position: "relative", marginBottom: 20 }}>
              <div className="serif" style={{ position: "absolute", left: -100, top: -8, color: CONFIG.THEME.textDim, width: 50, textAlign: "right", fontStyle: "italic" }}>{h % 12 || 12} {h < 12 ? 'AM' : 'PM'}</div>
              <div style={{ position: "absolute", left: -46, top: 4, width: 11, height: 11, borderRadius: "50%", background: CONFIG.THEME.bg, border: `2px solid ${CONFIG.THEME.border}` }} />
              {slotEvents.map(ev => {
                 const tag = tags.find(t => t.id === ev.category) || tags[0];
                 return (
                  <div key={ev.id} onClick={() => onEdit(ev)} className="event-card" style={{ position: "relative", marginBottom: 12, width: "100%", background: CONFIG.THEME.card, borderLeftColor: tag.color, padding: "20px" }}>
                    <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Playfair Display' }}>{ev.title}</div>
                    <div style={{ fontSize: 13, color: CONFIG.THEME.textDim, marginTop: 4 }}>{ev.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} — {ev.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  </div>
                 )
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ date, events, setDate, setView }) {
  return (
    <div className="fade-in" style={{ padding: "40px", overflowX: "auto" }}>
      <div style={{ minWidth: 1000 }}>
        <div style={{ display: "flex", marginLeft: 100, marginBottom: 16 }}>
           {Array.from({length: CONFIG.YEAR_COLUMNS}).map((_,i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: CONFIG.THEME.textDim }}>{i+1}</div>)}
        </div>
        {Array.from({length: 12}).map((_, m) => (
          <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 8, height: 36 }}>
            <div className="serif" style={{ width: 100, color: CONFIG.THEME.textDim }}>{new Date(date.getFullYear(), m, 1).toLocaleDateString('en-US',{month:'short'})}</div>
            <div style={{ flex: 1, display: "flex", gap: 2 }}>
              {Array.from({length: CONFIG.YEAR_COLUMNS}).map((_, col) => {
                 const d = new Date(date.getFullYear(), m, col + 1);
                 const hasEv = events.some(e => e.start.toDateString() === d.toDateString());
                 return <div key={col} style={{ flex: 1, height: 24, borderRadius: 4, background: hasEv ? CONFIG.THEME.border : 'transparent' }} />
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  return (
    <div style={{ height: "100vh", background: CONFIG.THEME.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 className="serif" style={{ fontSize: 64, color: CONFIG.THEME.text, marginBottom: 24 }}>Timeline.</h1>
      <p style={{ color: CONFIG.THEME.textDim, marginBottom: 40, fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 18 }}>"Time is the luxury you cannot buy."</p>
      <button onClick={onLogin} className="btn-reset" style={{ padding: "16px 40px", borderRadius: 4, background: CONFIG.THEME.accent, color: "#fff", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Enter System</button>
    </div>
  );
}