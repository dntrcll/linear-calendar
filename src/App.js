/* ===========================
   MASTER CODE — PART 1 / 3
   CORE + STYLES + APP SHELL
   =========================== */

   import { useEffect, useState, useRef, useMemo } from "react";
   import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
   import { auth, provider } from "./firebase";
   import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
   import { db } from "./firebase";
   
   /* ===========================
      SYSTEM CONFIG
      =========================== */
   
   const APP_META = { name: "Timeline", version: "4.5.0-Live" };
   
   const LAYOUT = {
     SIDEBAR_WIDTH: 300,
     HEADER_HEIGHT: 72,
     PIXELS_PER_MINUTE: 2.4,
     YEAR_COLS: 38
   };
   
   const QUOTES = [
     "Time is the luxury you cannot buy.",
     "Design your life, or someone else will.",
     "Focus on the rhythm, not the speed."
   ];
   
   /* ===========================
      TEMPORAL AWARENESS
      =========================== */
   
   const getNowPosition = () =>
     (new Date().getHours() * 60 + new Date().getMinutes()) * LAYOUT.PIXELS_PER_MINUTE;
   
   /* ===========================
      STYLES
      =========================== */
   
   const CSS = `
   :root { --ease:cubic-bezier(.22,1,.36,1); }
   body { margin:0; font-family:Inter,sans-serif; overflow:hidden }
   .fade-enter { animation:fade .4s var(--ease) both }
   @keyframes fade { from{opacity:0;transform:translateY(8px)} to{opacity:1} }
   
   .now-line{
    position:absolute;height:2px;left:0;right:0;
    background:var(--now-color);z-index:6;
    animation:pulse 2s infinite ease-in-out
   }
   .now-dot{
    position:absolute;left:-6px;top:-4px;
    width:10px;height:10px;border-radius:50%;
    background:var(--now-color)
   }
   @keyframes pulse{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
   
   .past-event{opacity:.45;filter:grayscale(.4)}
   `;
   
   export default function TimelineOS() {
     const [user, setUser] = useState(null);
     const [loading, setLoading] = useState(true);
     const [now, setNow] = useState(new Date());
     const [currentDate, setCurrentDate] = useState(new Date());
     const [viewMode, setViewMode] = useState("week");
     const [events, setEvents] = useState([]);
     const [modalOpen, setModalOpen] = useState(false);
     const [editingEvent, setEditingEvent] = useState(null);
   
     const scrollRef = useRef(null);
   
     useEffect(() => {
       const s = document.createElement("style");
       s.textContent = CSS;
       document.head.appendChild(s);
       const t = setInterval(() => setNow(new Date()), 60000);
       return () => { s.remove(); clearInterval(t); };
     }, []);
   
     useEffect(() => {
       setPersistence(auth, browserLocalPersistence);
       return auth.onAuthStateChanged(async u => {
         setUser(u);
         if (!u) return setLoading(false);
         const q = query(collection(db,"events"), where("uid","==",u.uid));
         const snap = await getDocs(q);
         setEvents(
           snap.docs.map(d=>({
             id:d.id,
             ...d.data(),
             start:d.data().startTime.toDate(),
             end:d.data().endTime.toDate()
           }))
         );
         setLoading(false);
       });
     }, []);
   
     if (!user) return <AuthScreen onLogin={()=>signInWithPopup(auth,provider)} />;
   
     return (
       <div
         className="fade-enter"
         style={{
           display:"flex",
           height:"100vh",
           "--now-color":"#F43F5E"
         }}
       >
         <aside style={{width:LAYOUT.SIDEBAR_WIDTH,padding:24}}>
           <h1>Timeline</h1>
           <button onClick={()=>{setEditingEvent(null);setModalOpen(true)}}>New Event</button>
           <button onClick={()=>signOut(auth)}>Sign out</button>
         </aside>
   
         <main style={{flex:1,overflow:"hidden"}}>
           <header style={{height:LAYOUT.HEADER_HEIGHT}}>
             <button onClick={()=>setViewMode("day")}>Day</button>
             <button onClick={()=>setViewMode("week")}>Week</button>
             <button onClick={()=>setViewMode("month")}>Month</button>
           </header>
   
           <div ref={scrollRef} style={{flex:1,overflow:"auto",position:"relative"}}>
             {viewMode==="week" &&
               <WeekView
                 date={currentDate}
                 events={events}
                 now={now}
                 onEdit={ev=>{setEditingEvent(ev);setModalOpen(true)}}
               />}
           </div>
         </main>
   
         {modalOpen &&
           <EventEditor
             event={editingEvent}
             onClose={()=>setModalOpen(false)}
             onSave={async data=>{
               const payload={
                 uid:user.uid,
                 title:data.title,
                 startTime:Timestamp.fromDate(data.start),
                 endTime:Timestamp.fromDate(data.end),
                 updatedAt:serverTimestamp()
               };
               data.id
                 ? await updateDoc(doc(db,"events",data.id),payload)
                 : await addDoc(collection(db,"events"),payload);
               setModalOpen(false);
             }}
           />}
       </div>
     );
   }
/* ===========================
   MASTER CODE — PART 2 / 3
   WEEK VIEW + NOW LINE
   =========================== */

   function WeekView({ date, events, now, onEdit }) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
  
    const days = Array.from({length:7},(_,i)=>{
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      return d;
    });
  
    const H = 60 * LAYOUT.PIXELS_PER_MINUTE;
  
    return (
      <div style={{display:"flex",height:"100%"}}>
        <div style={{width:60}}>
          {Array.from({length:24}).map((_,h)=>(
            <div key={h} style={{height:H,fontSize:11}}>{h}:00</div>
          ))}
        </div>
  
        {days.map((d,i)=>{
          const isToday=d.toDateString()===now.toDateString();
          const dayEvents=events.filter(e=>e.start.toDateString()===d.toDateString());
          return (
            <div key={i} style={{flex:1,position:"relative",borderLeft:"1px solid #333"}}>
              <div style={{height:48,textAlign:"center"}}>
                <strong>{d.toLocaleDateString("en",{weekday:"short"})}</strong>
                <div>{d.getDate()}</div>
              </div>
  
              <div style={{position:"relative",height:24*H}}>
                {isToday &&
                  <div className="now-line" style={{top:getNowPosition()}}>
                    <div className="now-dot"/>
                  </div>
                }
  
                {dayEvents.map(ev=>{
                  const top=(ev.start.getHours()*60+ev.start.getMinutes())*LAYOUT.PIXELS_PER_MINUTE;
                  const h=((ev.end-ev.start)/60000)*LAYOUT.PIXELS_PER_MINUTE;
                  const past=ev.end<now;
                  return (
                    <div
                      key={ev.id}
                      className={past?"past-event":""}
                      onClick={()=>onEdit(ev)}
                      style={{
                        position:"absolute",
                        top,
                        left:4,
                        right:4,
                        height:h,
                        background:"#1F2937",
                        padding:4,
                        cursor:"pointer"
                      }}
                    >
                      <div style={{fontWeight:600}}>{ev.title}</div>
                      <div style={{fontSize:10}}>
                        {Math.round((ev.end-ev.start)/60000)}m
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
/* ===========================
   MASTER CODE — PART 3 / 3
   MODALS + AUTH
   =========================== */

   function EventEditor({ event, onSave, onClose }) {
    const [title,setTitle]=useState(event?.title||"");
    const [start,setStart]=useState(event?.start?.toTimeString().slice(0,5)||"09:00");
    const [end,setEnd]=useState(event?.end?.toTimeString().slice(0,5)||"10:00");
  
    const submit=()=>{
      const base=event?.start||new Date();
      const s=new Date(base);const [sh,sm]=start.split(":");s.setHours(sh,sm);
      const e=new Date(s);const [eh,em]=end.split(":");e.setHours(eh,em);
      onSave({id:event?.id,title,start:s,end:e});
    };
  
    return (
      <div style={{
        position:"fixed",inset:0,
        background:"rgba(0,0,0,.6)",
        display:"flex",alignItems:"center",justifyContent:"center"
      }}>
        <div style={{background:"#111",padding:24,width:360}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title"/>
          <input type="time" value={start} onChange={e=>setStart(e.target.value)}/>
          <input type="time" value={end} onChange={e=>setEnd(e.target.value)}/>
          <button onClick={submit}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    );
  }
  
  function AuthScreen({ onLogin }) {
    return (
      <div style={{
        height:"100vh",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center"
      }}>
        <h1>Timeline</h1>
        <button onClick={onLogin}>Enter</button>
      </div>
    );
  }
       