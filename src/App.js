import { useEffect, useState, useRef } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
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

const PIXELS_PER_MINUTE = 3;
const EVENT_HEIGHT = 56;
const ROW_GAP = 12;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

const CATEGORY_COLORS = {
  Work: { bg: "linear-gradient(135deg, #667eea, #764ba2)", light: "#eef2ff", text: "#4338ca" },
  Personal: { bg: "linear-gradient(135deg, #43e97b, #38f9d7)", light: "#ecfdf5", text: "#065f46" },
  Meeting: { bg: "linear-gradient(135deg, #fa709a, #fee140)", light: "#fef3c7", text: "#92400e" },
  Event: { bg: "linear-gradient(135deg, #4facfe, #00f2fe)", light: "#dbeafe", text: "#075985" },
  Other: { bg: "linear-gradient(135deg, #a8edea, #fed6e3)", light: "#fce7f3", text: "#9f1239" },
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);
  const [familySpaceId, setFamilySpaceId] = useState(null);
  const [inviteCode, setInviteCode] = useState("");

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [todos, setTodos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("Personal");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  const [viewMode, setViewMode] = useState("day");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(() => {
    const saved = localStorage.getItem('weekStartsOnMonday');
    return saved ? JSON.parse(saved) : false;
  });

  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [previewTimes, setPreviewTimes] = useState(null);
  
  const [todoInput, setTodoInput] = useState("");
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrevious, setCalcPrevious] = useState(null);
  const [calcOperation, setCalcOperation] = useState(null);
  
  const timelineRef = useRef(null);
  const isSavingRef = useRef(false);
  const previewTimesRef = useRef(null);
  const currentStartMinutesRef = useRef(null);
  const currentEndMinutesRef = useRef(null);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("Auth persistence error:", err);
    });
    
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);
  
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

  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const scrollToCurrentTime = () => {
    if (viewMode === "day") {
      setTimeout(() => {
        const timeline = timelineRef.current;
        if (timeline) {
          const startOfDay = new Date(currentDate);
          startOfDay.setHours(0, 0, 0, 0);
          const nowPosition = ((now - startOfDay) / 60000) * PIXELS_PER_MINUTE;
          timeline.scrollTo({
            left: nowPosition - (window.innerWidth / 2),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  useEffect(() => {
    const isToday = currentDate.toDateString() === now.toDateString();
    if (isToday && viewMode === "day" && !isSavingRef.current) {
      scrollToCurrentTime();
    }
  }, [currentDate, viewMode, now]);

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

  useEffect(() => {
    loadEvents();
  }, [user, spaceId]);

  useEffect(() => {
    localStorage.setItem('weekStartsOnMonday', JSON.stringify(weekStartsOnMonday));
  }, [weekStartsOnMonday]);

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
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ref = await addDoc(collection(db, "spaces"), {
        name: "Family",
        ownerId: user.uid,
        members: [user.uid],
        type: "shared",
        inviteCode: code,
        createdAt: serverTimestamp(),
      });
      setFamilySpaceId(ref.id);
      setSpaceId(ref.id);
      setInviteCode(code);
      setShowInviteModal(true);
    } catch (err) {
      console.error("Error creating family space:", err);
      setError("Failed to create family space.");
    }
  };

  const joinFamilySpace = async (code) => {
    try {
      const q = query(collection(db, "spaces"), where("inviteCode", "==", code.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError("Invalid invite code");
        return;
      }

      const spaceDoc = snap.docs[0];
      const spaceData = spaceDoc.data();
      
      if (!spaceData.members.includes(user.uid)) {
        await updateDoc(doc(db, "spaces", spaceDoc.id), {
          members: [...spaceData.members, user.uid]
        });
      }
      
      setFamilySpaceId(spaceDoc.id);
      setSpaceId(spaceDoc.id);
      setShowInviteModal(false);
    } catch (err) {
      console.error("Error joining family space:", err);
      setError("Failed to join family space.");
    }
  };

  const openNewEvent = (presetStart = null, presetEnd = null) => {
    setEditingEvent(null);
    setTitle("");
    setEventCategory("Personal");
    
    if (presetStart && presetEnd) {
      setStartTime(presetStart.toISOString().slice(0, 16));
      setEndTime(presetEnd.toISOString().slice(0, 16));
    } else {
      const start = new Date(currentDate);
      start.setHours(now.getHours(), 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      
      setStartTime(start.toISOString().slice(0, 16));
      setEndTime(end.toISOString().slice(0, 16));
    }
    setShowModal(true);
    setMobileMenuOpen(false);
  };

  const openEditEvent = ev => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setEventCategory(ev.category || "Personal");
    
    const startISO = ev.start.toISOString().slice(0, 16);
    const endISO = ev.end.toISOString().slice(0, 16);
    
    setStartTime(startISO);
    setEndTime(endISO);
    setShowModal(true);
  };

  const duplicateEvent = async (ev) => {
    try {
      const newStart = new Date(ev.start);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(ev.end);
      newEnd.setDate(newEnd.getDate() + 1);

      const ref = await addDoc(collection(db, "events"), {
        spaceId,
        title: ev.title + " (Copy)",
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        category: ev.category || "Personal",
        deleted: false,
        createdAt: serverTimestamp(),
      });
      await logActivity("created", ref.id);
      await loadEvents();
    } catch (err) {
      console.error("Error duplicating event:", err);
      setError("Failed to duplicate event.");
    }
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
          category: eventCategory,
        });
        await logActivity("updated", editingEvent.id);
      } else {
        const ref = await addDoc(collection(db, "events"), {
          spaceId,
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
          category: eventCategory,
          deleted: false,
          createdAt: serverTimestamp(),
        });
        await logActivity("created", ref.id);
      }

      setShowModal(false);
      await loadEvents();
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
    } catch (err) {
      console.error("Error restoring event:", err);
      setError("Failed to restore event.");
    }
  };

  const addTodo = () => {
    if (!todoInput.trim()) return;
    setTodos([...todos, { id: Date.now(), text: todoInput, done: false }]);
    setTodoInput("");
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const handleCalc = (value) => {
    if (value === "C") {
      setCalcDisplay("0");
      setCalcPrevious(null);
      setCalcOperation(null);
    } else if (value === "=") {
      if (calcPrevious !== null && calcOperation) {
        const current = parseFloat(calcDisplay);
        const prev = parseFloat(calcPrevious);
        let result = 0;
        
        switch(calcOperation) {
          case "+": result = prev + current; break;
          case "-": result = prev - current; break;
          case "×": result = prev * current; break;
          case "÷": result = prev / current; break;
          default: break;
        }
        
        setCalcDisplay(result.toString());
        setCalcPrevious(null);
        setCalcOperation(null);
      }
    } else if (["+", "-", "×", "÷"].includes(value)) {
      setCalcPrevious(calcDisplay);
      setCalcOperation(value);
      setCalcDisplay("0");
    } else {
      setCalcDisplay(calcDisplay === "0" ? value : calcDisplay + value);
    }
  };

  const formatTime = d => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const today = currentDate;
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const toLeft = d => ((d - startOfDay) / 60000) * PIXELS_PER_MINUTE;

  const handleTimelineClick = (e) => {
    if (draggingEvent || resizingEvent) return;
    
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const rect = timeline.getBoundingClientRect();
    const scrollLeft = timeline.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    
    const minutes = Math.round((clickX / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES;
    const clampedMinutes = Math.max(0, Math.min(minutes, 1440 - 60));
    
    const startDate = new Date(startOfDay.getTime() + clampedMinutes * 60000);
    const endDate = new Date(startDate.getTime() + 60 * 60000);
    
    openNewEvent(startDate, endDate);
  };

  const handleResizeStart = (e, ev, handle) => {
    e.stopPropagation();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    setResizingEvent(ev);
    setResizeHandle(handle);
    setDragStartX(clientX);
    
    const startMinutes = ((ev.start - startOfDay) / 60000);
    const endMinutes = ((ev.end - startOfDay) / 60000);
    currentStartMinutesRef.current = startMinutes;
    currentEndMinutesRef.current = endMinutes;
    
    const times = { start: ev.start, end: ev.end };
    setPreviewTimes(times);
    previewTimesRef.current = times;
  };

  const handleResizeMove = (e) => {
    if (!resizingEvent) return;
    
    e.preventDefault();
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const rect = timeline.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const scrollLeft = timeline.scrollLeft;
    
    const mouseX = clientX - rect.left + scrollLeft;
    const minutes = mouseX / PIXELS_PER_MINUTE;
    const snappedMinutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
    
    let newStartMinutes, newEndMinutes;
    
    if (resizeHandle === 'left') {
      const maxStartMinutes = currentEndMinutesRef.current - MIN_EVENT_DURATION;
      newStartMinutes = Math.max(0, Math.min(snappedMinutes, maxStartMinutes));
      newEndMinutes = currentEndMinutesRef.current;
    } else {
      const minEndMinutes = currentStartMinutesRef.current + MIN_EVENT_DURATION;
      newStartMinutes = currentStartMinutesRef.current;
      newEndMinutes = Math.max(minEndMinutes, Math.min(snappedMinutes, 1440));
    }
    
    currentStartMinutesRef.current = newStartMinutes;
    currentEndMinutesRef.current = newEndMinutes;
    
    const newLeft = newStartMinutes * PIXELS_PER_MINUTE;
    const newWidth = (newEndMinutes - newStartMinutes) * PIXELS_PER_MINUTE;
    
    const eventElement = document.querySelector(`[data-event-id="${resizingEvent.id}"]`);
    if (eventElement) {
      eventElement.style.left = `${newLeft}px`;
      eventElement.style.width = `${newWidth}px`;
      eventElement.style.opacity = '0.7';
    }
    
    const newStart = new Date(startOfDay.getTime() + newStartMinutes * 60000);
    const newEnd = new Date(startOfDay.getTime() + newEndMinutes * 60000);
    const times = { start: newStart, end: newEnd };
    setPreviewTimes(times);
    previewTimesRef.current = times;
  };

  const handleResizeEnd = async (e) => {
    if (!resizingEvent || !previewTimesRef.current) {
      return;
    }
    
    const currentScrollPosition = timelineRef.current?.scrollLeft;
    isSavingRef.current = true;
    
    const newStart = previewTimesRef.current.start;
    const newEnd = previewTimesRef.current.end;
    
    try {
      await updateDoc(doc(db, "events", resizingEvent.id), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      });
      
      await logActivity("updated", resizingEvent.id);
      await loadEvents();
      
      setTimeout(() => {
        if (timelineRef.current && currentScrollPosition !== null) {
          timelineRef.current.scrollLeft = currentScrollPosition;
        }
        isSavingRef.current = false;
      }, 50);
      
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to resize event: " + err.message);
      await loadEvents();
      isSavingRef.current = false;
    }
    
    setResizingEvent(null);
    setResizeHandle(null);
    setDragStartX(0);
    setPreviewTimes(null);
    previewTimesRef.current = null;
    currentStartMinutesRef.current = null;
    currentEndMinutesRef.current = null;
  };

  const handleDragStart = (e, ev) => {
    e.stopPropagation();
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const rect = timeline.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const scrollLeft = timeline.scrollLeft;
    
    setDraggingEvent(ev);
    setDragStartX(clientX);
    
    const eventLeft = toLeft(ev.start);
    const mousePositionInTimeline = clientX - rect.left + scrollLeft;
    setDragOffset(mousePositionInTimeline - eventLeft);
    
    const startMinutes = ((ev.start - startOfDay) / 60000);
    const endMinutes = ((ev.end - startOfDay) / 60000);
    currentStartMinutesRef.current = startMinutes;
    currentEndMinutesRef.current = endMinutes;
    
    const times = { start: ev.start, end: ev.end };
    setPreviewTimes(times);
    previewTimesRef.current = times;
  };

  const handleDragMove = (e) => {
    if (!draggingEvent) return;
    
    e.preventDefault();
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const rect = timeline.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const scrollLeft = timeline.scrollLeft;
    
    const mousePositionInTimeline = clientX - rect.left + scrollLeft;
    let newLeft = mousePositionInTimeline - dragOffset;
    
    const durationMinutes = currentEndMinutesRef.current - currentStartMinutesRef.current;
    
    const newStartMinutes = Math.round((newLeft / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES;
    
    const clampedStartMinutes = Math.max(0, Math.min(newStartMinutes, 1440 - durationMinutes));
    const clampedEndMinutes = clampedStartMinutes + durationMinutes;
    
    currentStartMinutesRef.current = clampedStartMinutes;
    currentEndMinutesRef.current = clampedEndMinutes;
    
    const snappedLeft = clampedStartMinutes * PIXELS_PER_MINUTE;
    const width = durationMinutes * PIXELS_PER_MINUTE;
    
    const eventElement = document.querySelector(`[data-event-id="${draggingEvent.id}"]`);
    if (eventElement) {
      eventElement.style.left = `${snappedLeft}px`;
      eventElement.style.width = `${width}px`;
      eventElement.style.opacity = '0.7';
      eventElement.style.cursor = 'grabbing';
    }
    
    const newStart = new Date(startOfDay.getTime() + clampedStartMinutes * 60000);
    const newEnd = new Date(startOfDay.getTime() + clampedEndMinutes * 60000);
    const times = { start: newStart, end: newEnd };
    setPreviewTimes(times);
    previewTimesRef.current = times;
  };

  const handleDragEnd = async (e) => {
    if (!draggingEvent || !previewTimesRef.current) {
      return;
    }
    
    const currentScrollPosition = timelineRef.current?.scrollLeft;
    isSavingRef.current = true;
    
    const newStart = previewTimesRef.current.start;
    const newEnd = previewTimesRef.current.end;
    
    try {
      await updateDoc(doc(db, "events", draggingEvent.id), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      });
      
      await logActivity("updated", draggingEvent.id);
      await loadEvents();
      
      setTimeout(() => {
        if (timelineRef.current && currentScrollPosition !== null) {
          timelineRef.current.scrollLeft = currentScrollPosition;
        }
        isSavingRef.current = false;
      }, 50);
      
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to reschedule event: " + err.message);
      await loadEvents();
      isSavingRef.current = false;
    }
    
    setDraggingEvent(null);
    setDragOffset(0);
    setDragStartX(0);
    setPreviewTimes(null);
    previewTimesRef.current = null;
    currentStartMinutesRef.current = null;
    currentEndMinutesRef.current = null;
  };

  useEffect(() => {
    if (draggingEvent || resizingEvent) {
      const handleMove = (e) => {
        if (draggingEvent) handleDragMove(e);
        if (resizingEvent) handleResizeMove(e);
      };
      const handleEnd = (e) => {
        if (draggingEvent) handleDragEnd(e);
        if (resizingEvent) handleResizeEnd(e);
      };
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [draggingEvent, resizingEvent, dragOffset]);

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

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setTimeout(() => scrollToCurrentTime(), 100);
  };

  const goToDate = (date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const getWeekDays = (date) => {
    const days = [];
    const current = new Date(date);
    let dayOfWeek = current.getDay();
    
    if (weekStartsOnMonday) {
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }
    
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getYearMonths = () => {
    const months = [];
    const currentYear = currentDate.getFullYear();
    for (let i = 0; i < 12; i++) {
      months.push(new Date(currentYear, i, 1));
    }
    return months;
  };

  const weekday = today.toLocaleDateString(undefined, { weekday: "long" });
  const dayDate = today.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const monthYear = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const nowLeft = toLeft(now);
  const isToday = today.toDateString() === now.toDateString();

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay();
    
    if (weekStartsOnMonday) {
      startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    }
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const weekDayHeaders = weekStartsOnMonday 
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  const monthDays = getDaysInMonth(currentDate);
  const weekDays = getWeekDays(currentDate);
  const yearMonths = getYearMonths();
  
  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || ev.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  
  const dayEvents = filteredEvents.filter(ev => ev.start.toDateString() === today.toDateString());

  const stacked = [];
  dayEvents.forEach(ev => {
    let row = 0;
    while (stacked.some(e => e.row === row && !(ev.end <= e.start || ev.start >= e.end))) row++;
    stacked.push({ ...ev, row });
  });

  if (!user) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        padding: 20
      }}>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.98)", padding: "48px 32px", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Timeline</h1>
          <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 16 }}>Linear calendar for the future</p>
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

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    }}>
      <div style={{
        background: "rgba(15, 12, 41, 0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "12px 16px",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Timeline</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openNewEvent()} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              + Event
            </button>
            <button onClick={() => signOut(auth)} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ color: "#fff", marginBottom: 20 }}>
          <h3>Events</h3>
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
          {events.length === 0 ? (
            <p>No events yet. Click + Event to create one!</p>
          ) : (
            <div>
              {events.map(ev => (
                <div key={ev.id} onClick={() => openEditEvent(ev)} style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, marginBottom: 8, cursor: "pointer" }}>
                  <div style={{ fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {formatTime(ev.start)} – {formatTime(ev.end)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: 20
        }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "rgba(15, 12, 41, 0.98)",
            borderRadius: 20,
            width: "100%",
            maxWidth: 480,
            padding: 24,
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#fff" }}>{editingEvent ? "Edit Event" : "New Event"}</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", marginBottom: 8, fontSize: 14 }}>Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Event title"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", marginBottom: 8, fontSize: 14 }}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setEventCategory(cat)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: eventCategory === cat ? "2px solid #667eea" : "2px solid rgba(255,255,255,0.1)",
                      background: eventCategory === cat ? "rgba(102, 126, 234, 0.2)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", marginBottom: 8, fontSize: 14 }}>Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 15,
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", marginBottom: 8, fontSize: 14 }}>End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 15,
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={saveEvent}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 16
                }}
              >
                {loading ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 16
                }}
              >
                Cancel
              </button>
            </div>

            {editingEvent && (
              <button
                onClick={deleteEvent}
                style={{
                  width: "100%",
                  marginTop: 12,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 12,
                  padding: "14px",
                  cursor: "pointer",
                  color: "#fca5a5",
                  fontWeight: 600,
                  fontSize: 16
                }}
              >
                Delete Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}