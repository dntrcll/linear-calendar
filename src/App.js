import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const APP_NAME = "Linear";
const SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
const CONFIG = { PPM: 2, SNAP: 15, COLS: 37, CELL: 32 };

const THEMES = {
  light: { bg: "#FAFAF9", sidebar: "#FFF", card: "#FFF", text: "#1C1917", textSec: "#78716C", textMuted: "#A8A29E", border: "#E7E5E4", grid: "#F5F5F4", accent: "#059669", accentLight: "#ECFDF5", glow: "rgba(5,150,105,0.15)", shadow: "0 4px 24px -4px rgba(0,0,0,0.08)", evShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  dark: { bg: "#0C0A09", sidebar: "#1C1917", card: "#1C1917", text: "#FAFAF9", textSec: "#A8A29E", textMuted: "#78716C", border: "#292524", grid: "#1C1917", accent: "#10B981", accentLight: "#064E3B", glow: "rgba(16,185,129,0.2)", shadow: "0 8px 32px -4px rgba(0,0,0,0.5)", evShadow: "0 2px 8px rgba(0,0,0,0.3)" }
};

const CATS = [
  { id: 'work', name: "Work", color: "#059669", bg: "#ECFDF5", darkBg: "#064E3B" },
  { id: 'personal', name: "Personal", color: "#84CC16", bg: "#F7FEE7", darkBg: "#365314" },
  { id: 'meeting', name: "Meeting", color: "#F59E0B", bg: "#FFFBEB", darkBg: "#78350F" },
  { id: 'urgent', name: "Urgent", color: "#EF4444", bg: "#FEF2F2", darkBg: "#7F1D1D" },
  { id: 'focus', name: "Focus", color: "#6366F1", bg: "#EEF2FF", darkBg: "#3730A3" },
];

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;overflow:hidden}h1,h2,h3,.brand{font-family:'Space Grotesk',sans-serif}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(120,113,108,0.3);border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(5,150,105,0.4)}50%{transform:scale(1.1)}70%{box-shadow:0 0 0 8px rgba(5,150,105,0)}}.fade-in{animation:fadeIn .3s ease-out forwards}.pulse{animation:pulse 2s ease-in-out infinite}.btn-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:none;background:transparent;cursor:pointer;transition:.15s}.input{width:100%;padding:10px 14px;border-radius:10px;font-size:14px;border:1px solid transparent;transition:.2s}.input:focus{outline:none}`;

export default function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState("year");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(() => { const s = localStorage.getItem('linear_cfg'); return s ? JSON.parse(s) : { dark: false, h24: false, monStart: true }; });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState(CATS.map(c => c.id));
  const [drag, setDrag] = useState(null);
  const scrollRef = useRef(null);
  const theme = settings.dark ? THEMES.dark : THEMES.light;

  useEffect(() => { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence); return auth.onAuthStateChanged(u => { setUser(u); if (u) load(); }); }, []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { localStorage.setItem('linear_cfg', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if ((view === 'day' || view === 'week') && scrollRef.current) setTimeout(() => { scrollRef.current.scrollTop = 8 * 60 * CONFIG.PPM; }, 100); }, [view]);

  const load = async () => { if (!user) return; setLoading(true); try { const q = query(collection(db, "events"), where("spaceId", "==", SPACE_ID), where("deleted", "==", false)); const snap = await getDocs(q); setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() }))); } catch (e) { console.error(e); } setLoading(false); };

  const save = async (data) => { if (!user) return; try { const p = { spaceId: SPACE_ID, title: data.title, category: data.category, startTime: Timestamp.fromDate(data.start), endTime: Timestamp.fromDate(data.end), deleted: false, updatedAt: serverTimestamp() }; if (data.id) await updateDoc(doc(db, "events", data.id), p); else { p.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), p); } setModal(false); load(); } catch (e) { console.error(e); alert("Failed"); } };

  const del = async (id) => { await updateDoc(doc(db, "events", id), { deleted: true, deletedAt: serverTimestamp() }); setModal(false); load(); };

  const isToday = (d) => d.toDateString() === now.toDateString();
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: settings.h24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !settings.h24 });
  const filtered = useMemo(() => events.filter(e => filters.includes(e.category)), [events, filters]);
  const nav = (n) => { const d = new Date(currentDate); if (view === 'year') d.setFullYear(d.getFullYear() + n); else if (view === 'week') d.setDate(d.getDate() + n * 7); else d.setDate(d.getDate() + n); setCurrentDate(d); };

  const weekDays = useMemo(() => { const s = new Date(currentDate); const day = s.getDay(); const diff = s.getDate() - day + (settings.monStart ? (day === 0 ? -6 : 1) : 0); return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(diff + i); return d; }); }, [currentDate, settings.monStart]);

  const onDragStart = (e, ev, mode) => { if (e.button !== 0) return; e.stopPropagation(); setDrag({ id: ev.id, mode, startY: e.clientY, origStart: new Date(ev.start), origEnd: new Date(ev.end) }); };
  const onDragMove = useCallback((e) => { if (!drag) return; const diff = Math.floor((e.clientY - drag.startY) / CONFIG.PPM / CONFIG.SNAP) * CONFIG.SNAP; if (diff === 0) return; setEvents(prev => prev.map(ev => { if (ev.id !== drag.id) return ev; const s = new Date(drag.origStart); const end = new Date(drag.origEnd); if (drag.mode === 'move') { s.setMinutes(s.getMinutes() + diff); end.setMinutes(end.getMinutes() + diff); } else { end.setMinutes(end.getMinutes() + diff); if ((end - s) < 15 * 60000) return ev; } return { ...ev, start: s, end }; })); }, [drag]);
  const onDragEnd = useCallback(async () => { if (!drag) return; const ev = events.find(e => e.id === drag.id); if (ev) try { await updateDoc(doc(db, "events", ev.id), { startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end) }); } catch { load(); } setDrag(null); }, [drag, events]);
  useEffect(() => { if (drag) { window.addEventListener('mousemove', onDragMove); window.addEventListener('mouseup', onDragEnd); } return () => { window.removeEventListener('mousemove', onDragMove); window.removeEventListener('mouseup', onDragEnd); }; }, [drag, onDragMove, onDragEnd]);

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0C0A09 0%, #1C1917 50%, #064E3B 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="fade-in" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(16,185,129,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h1 className="brand" style={{ fontSize: 48, color: "#FAFAF9", letterSpacing: "-2px" }}>{APP_NAME}</h1>
        </div>
        <p style={{ color: "#A8A29E", fontSize: 16, marginBottom: 40 }}>Precision time architecture</p>
        <button onClick={() => signInWithPopup(auth, provider)} style={{ padding: "16px 48px", borderRadius: 14, background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 32px rgba(16,185,129,0.4)" }}>Enter Workspace</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text, transition: "all .3s" }}>
      {/* SIDEBAR */}
      <aside style={{ width: sidebarOpen ? 260 : 0, overflow: "hidden", background: theme.sidebar, borderRight: sidebarOpen ? `1px solid ${theme.border}` : "none", display: "flex", flexDirection: "column", transition: "all .3s", flexShrink: 0 }}>
        <div style={{ padding: 24, opacity: sidebarOpen ? 1 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${theme.accent}, #047857)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${theme.glow}` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <span className="brand" style={{ fontSize: 22, fontWeight: 700 }}>{APP_NAME}</span>
          </div>
          <button onClick={() => { setEditing(null); setModal(true); }} style={{ width: "100%", padding: "12px 20px", borderRadius: 12, background: `linear-gradient(135deg, ${theme.accent}, #047857)`, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 16px ${theme.glow}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 18 }}>+</span> New Event
          </button>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className="btn-icon" style={{ color: theme.textSec, width: 28, height: 28 }}>‹</button>
                <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className="btn-icon" style={{ color: theme.textSec, width: 28, height: 28 }}>›</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
              {(settings.monStart ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"]).map((d, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, padding: 4 }}>{d}</span>)}
              {(() => { const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); let start = d.getDay(); if (settings.monStart) start = start === 0 ? 6 : start - 1; const days = []; for (let i = 0; i < start; i++) days.push(<div key={`e-${i}`} />); while (d.getMonth() === currentDate.getMonth()) { const c = new Date(d); const isTd = isToday(c); days.push(<div key={d.getDate()} onClick={() => { setCurrentDate(c); setView('day'); }} style={{ fontSize: 11, fontWeight: isTd ? 700 : 500, padding: "6px 0", borderRadius: 6, cursor: "pointer", background: isTd ? theme.accent : "transparent", color: isTd ? "#fff" : theme.text }}>{d.getDate()}</div>); d.setDate(d.getDate() + 1); } return days; })()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Categories</div>
            {CATS.map(cat => <div key={cat.id} onClick={() => setFilters(p => p.includes(cat.id) ? p.filter(x => x !== cat.id) : [...p, cat.id])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", opacity: filters.includes(cat.id) ? 1 : 0.4, transition: ".2s" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} /><span style={{ fontSize: 13, fontWeight: 500 }}>{cat.name}</span></div>)}
          </div>
        </div>
        <div style={{ marginTop: "auto", padding: 16, borderTop: `1px solid ${theme.border}`, display: "flex", gap: 8, opacity: sidebarOpen ? 1 : 0 }}>
          <button onClick={() => setSidebarOpen(false)} className="btn-icon" style={{ color: theme.textSec }}>«</button>
          <button onClick={() => setSettingsOpen(true)} className="btn-icon" style={{ color: theme.textSec }}>⚙</button>
        </div>
      </aside>
      {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} style={{ position: "fixed", left: 0, top: "50%", transform: "translateY(-50%)", width: 24, height: 60, background: theme.accent, border: "none", borderRadius: "0 8px 8px 0", color: "#fff", cursor: "pointer", zIndex: 50 }}>»</button>}

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 64, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: theme.bg, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
              {['Day', 'Week', 'Year'].map(m => <button key={m} onClick={() => setView(m.toLowerCase())} style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: view === m.toLowerCase() ? theme.card : "transparent", color: view === m.toLowerCase() ? theme.accent : theme.textSec, boxShadow: view === m.toLowerCase() ? theme.evShadow : "none", transition: ".2s" }}>{m}</button>)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => nav(-1)} className="btn-icon" style={{ color: theme.text, border: `1px solid ${theme.border}`, background: theme.card }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} style={{ padding: "6px 16px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>Today{isToday(currentDate) && <div className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent }} />}</button>
              <button onClick={() => nav(1)} className="btn-icon" style={{ color: theme.text, border: `1px solid ${theme.border}`, background: theme.card }}>→</button>
            </div>
            <h2 className="brand" style={{ fontSize: 20, fontWeight: 600 }}>{view === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setEditing(null); setModal(true); }} style={{ padding: "8px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${theme.accent}, #047857)`, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${theme.glow}` }}>+ Add Event</button>
            <div onClick={() => signOut(auth)} style={{ width: 36, height: 36, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{user.displayName?.[0] || "U"}</div>
          </div>
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
          {/* YEAR VIEW */}
          {view === 'year' && (
            <div className="fade-in" style={{ padding: "32px 40px", minHeight: "100%" }}>
              <div style={{ display: "flex", marginLeft: 80, marginBottom: 16 }}>{Array.from({ length: CONFIG.COLS }).map((_, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.textMuted, minWidth: CONFIG.CELL }}>{(settings.monStart ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"])[i % 7]}</div>)}</div>
              {Array.from({ length: 12 }).map((_, mi) => {
                const md = new Date(currentDate.getFullYear(), mi, 1);
                const dim = new Date(currentDate.getFullYear(), mi + 1, 0).getDate();
                let sc = md.getDay(); if (settings.monStart) sc = sc === 0 ? 6 : sc - 1;
                return (
                  <div key={mi} style={{ display: "flex", alignItems: "center", marginBottom: 8, height: CONFIG.CELL + 4 }}>
                    <div style={{ width: 80, fontSize: 13, fontWeight: 600, color: theme.textSec, flexShrink: 0 }}>{md.toLocaleDateString('en-US', { month: 'short' })}</div>
                    <div style={{ flex: 1, display: "flex", gap: 2 }}>
                      {Array.from({ length: CONFIG.COLS }).map((_, col) => {
                        const dn = col - sc + 1;
                        if (dn < 1 || dn > dim) return <div key={col} style={{ flex: 1, minWidth: CONFIG.CELL }} />;
                        const date = new Date(currentDate.getFullYear(), mi, dn);
                        const isTd = isToday(date);
                        const dayEv = filtered.filter(e => e.start.toDateString() === date.toDateString());
                        const has = dayEv.length > 0;
                        return (
                          <div key={col} onClick={() => { setCurrentDate(date); setView('day'); }} style={{ flex: 1, minWidth: CONFIG.CELL, height: CONFIG.CELL, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isTd ? 700 : 500, cursor: "pointer", position: "relative", background: isTd ? theme.accent : has ? (settings.dark ? theme.accentLight : "#E7E5E4") : "transparent", color: isTd ? "#fff" : has ? (settings.dark ? "#10B981" : theme.text) : theme.text, transition: ".15s", border: isTd ? `2px solid ${theme.accent}` : "none" }}>
                            {dn}
                            {has && !isTd && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>{dayEv.slice(0, 3).map((ev, i) => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: CATS.find(c => c.id === ev.category)?.color || theme.accent }} />)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY/WEEK VIEW */}
          {(view === 'day' || view === 'week') && (
            <div style={{ display: "flex", minHeight: 24 * 60 * CONFIG.PPM }}>
              <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}`, background: theme.bg, position: "sticky", left: 0, zIndex: 10 }}>
                {Array.from({ length: 24 }).map((_, h) => <div key={h} style={{ height: 60 * CONFIG.PPM, position: "relative" }}><span style={{ position: "absolute", top: -8, right: 12, fontSize: 11, fontWeight: 600, color: theme.textMuted }}>{settings.h24 ? `${h}:00` : `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`}</span></div>)}
              </div>
              {(view === 'day' ? [currentDate] : weekDays).map((date, ci) => {
                const isTd = isToday(date);
                const dayEv = filtered.filter(e => e.start.toDateString() === date.toDateString());
                return (
                  <div key={ci} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, position: "relative", background: isTd ? theme.accentLight + "20" : "transparent" }}>
                    {view === 'week' && <div style={{ height: 56, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme.sidebar, position: "sticky", top: 0, zIndex: 15 }}><div style={{ fontSize: 11, fontWeight: 700, color: isTd ? theme.accent : theme.textMuted, textTransform: "uppercase" }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 18, fontWeight: 600, color: isTd ? theme.accent : theme.text }}>{date.getDate()}</span>{isTd && <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent }} />}</div></div>}
                    {Array.from({ length: 24 }).map((_, h) => <div key={h} style={{ height: 60 * CONFIG.PPM, borderBottom: `1px solid ${theme.grid}` }} />)}
                    {isTd && <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * CONFIG.PPM + (view === 'week' ? 56 : 0), left: 0, right: 0, height: 2, background: theme.accent, zIndex: 20, pointerEvents: "none" }}><div className="pulse" style={{ position: "absolute", left: -5, top: -4, width: 10, height: 10, borderRadius: "50%", background: theme.accent }} /></div>}
                    <div style={{ position: "absolute", inset: view === 'week' ? "56px 0 0 0" : 0, zIndex: 1 }} onClick={(e) => { if (drag) return; const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top; const mins = Math.floor(y / CONFIG.PPM / CONFIG.SNAP) * CONFIG.SNAP; const start = new Date(date); start.setHours(0, mins, 0, 0); const end = new Date(start); end.setMinutes(mins + 60); setEditing({ start, end, title: "", category: CATS[0].id }); setModal(true); }} />
                    {dayEv.map(ev => {
                      const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * CONFIG.PPM + (view === 'week' ? 56 : 0);
                      const height = Math.max(((ev.end - ev.start) / 60000) * CONFIG.PPM, 24);
                      const cat = CATS.find(c => c.id === ev.category) || CATS[0];
                      const isDrag = drag?.id === ev.id;
                      return (
                        <div key={ev.id} onMouseDown={(e) => onDragStart(e, ev, 'move')} onClick={(e) => { e.stopPropagation(); if (!drag) { setEditing(ev); setModal(true); } }} className="fade-in" style={{ position: "absolute", top, left: 4, right: 4, height, background: settings.dark ? cat.darkBg : cat.bg, borderLeft: `3px solid ${cat.color}`, borderRadius: 6, padding: "4px 8px", cursor: isDrag ? "grabbing" : "grab", boxShadow: isDrag ? theme.shadow : theme.evShadow, zIndex: isDrag ? 100 : 10, opacity: isDrag ? 0.9 : 1, transition: isDrag ? "none" : "box-shadow .2s" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: settings.dark ? "#fff" : cat.color, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title || "(No title)"}</div>
                          {height > 32 && <div style={{ fontSize: 10, color: theme.textSec, marginTop: 2 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>}
                          <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, ev, 'resize'); }} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, cursor: "ns-resize" }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {loading && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: theme.card, padding: "12px 24px", borderRadius: 12, boxShadow: theme.shadow, fontSize: 13 }}>Loading...</div>}
      </div>

      {/* SETTINGS */}
      {settingsOpen && (
        <div className="fade-in" onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 380, background: theme.card, padding: 28, borderRadius: 20, boxShadow: theme.shadow, border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><h3 className="brand" style={{ fontSize: 20 }}>Settings</h3><button onClick={() => setSettingsOpen(false)} className="btn-icon" style={{ color: theme.textSec }}>✕</button></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, fontWeight: 600 }}>Theme</div><div style={{ fontSize: 12, color: theme.textMuted }}>Light or dark</div></div><div style={{ display: "flex", background: theme.bg, padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}><button onClick={() => setSettings(s => ({ ...s, dark: false }))} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: !settings.dark ? theme.card : "transparent", color: !settings.dark ? theme.text : theme.textSec, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Light</button><button onClick={() => setSettings(s => ({ ...s, dark: true }))} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: settings.dark ? theme.card : "transparent", color: settings.dark ? theme.text : theme.textSec, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Dark</button></div></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, fontWeight: 600 }}>24-Hour Time</div><div style={{ fontSize: 12, color: theme.textMuted }}>Use military format</div></div><div onClick={() => setSettings(s => ({ ...s, h24: !s.h24 }))} style={{ width: 48, height: 26, borderRadius: 13, background: settings.h24 ? theme.accent : theme.border, cursor: "pointer", position: "relative", transition: ".2s" }}><div style={{ position: "absolute", top: 3, left: settings.h24 ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: ".2s" }} /></div></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, fontWeight: 600 }}>Week Starts Monday</div><div style={{ fontSize: 12, color: theme.textMuted }}>Week alignment</div></div><div onClick={() => setSettings(s => ({ ...s, monStart: !s.monStart }))} style={{ width: 48, height: 26, borderRadius: 13, background: settings.monStart ? theme.accent : theme.border, cursor: "pointer", position: "relative", transition: ".2s" }}><div style={{ position: "absolute", top: 3, left: settings.monStart ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: ".2s" }} /></div></div>
            </div>
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${theme.border}` }}><button onClick={() => signOut(auth)} style={{ width: "100%", padding: "12px 20px", borderRadius: 10, border: "1px solid #EF4444", background: "transparent", color: "#EF4444", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Sign Out</button></div>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {modal && (
        <div className="fade-in" onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, background: theme.card, padding: 28, borderRadius: 20, boxShadow: theme.shadow, border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><h3 className="brand" style={{ fontSize: 20 }}>{editing?.id ? "Edit Event" : "New Event"}</h3>{editing?.id && <button onClick={() => del(editing.id)} className="btn-icon" style={{ color: "#EF4444" }}>🗑</button>}</div>
            <EventForm event={editing} theme={theme} settings={settings} onSave={save} onCancel={() => setModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function EventForm({ event, theme, settings, onSave, onCancel }) {
  const [title, setTitle] = useState(event?.title || "");
  const [cat, setCat] = useState(event?.category || CATS[0].id);
  const [sTime, setSTime] = useState(event?.start?.toTimeString().slice(0, 5) || "09:00");
  const [eTime, setETime] = useState(event?.end?.toTimeString().slice(0, 5) || "10:00");
  const submit = () => { if (!title.trim()) return; const start = new Date(event?.start || new Date()); const [sh, sm] = sTime.split(':'); start.setHours(parseInt(sh), parseInt(sm), 0, 0); const end = new Date(start); const [eh, em] = eTime.split(':'); end.setHours(parseInt(eh), parseInt(em), 0, 0); if (end <= start) end.setDate(end.getDate() + 1); onSave({ id: event?.id, title, category: cat, start, end }); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="input" style={{ fontSize: 16, fontWeight: 600, background: theme.bg, color: theme.text, borderColor: theme.border }} />
      <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, marginBottom: 6, display: "block" }}>START</label><input type="time" value={sTime} onChange={e => setSTime(e.target.value)} className="input" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} /></div><div style={{ flex: 1 }}><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, marginBottom: 6, display: "block" }}>END</label><input type="time" value={eTime} onChange={e => setETime(e.target.value)} className="input" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} /></div></div>
      <div><label style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, marginBottom: 8, display: "block" }}>CATEGORY</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{CATS.map(c => <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: "6px 14px", borderRadius: 20, border: cat === c.id ? `2px solid ${c.color}` : `1px solid ${theme.border}`, background: cat === c.id ? c.bg : "transparent", color: cat === c.id ? c.color : theme.text, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: ".15s" }}>{c.name}</button>)}</div></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}><button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "transparent", color: theme.textSec, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button><button onClick={submit} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${theme.accent}, #047857)`, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${theme.glow}` }}>Save Event</button></div>
    </div>
  );
}
