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
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      padding: 0,
      margin: 0
    }}>
      <style>
{`
* {
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2); }
  50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.4); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.timeline-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: auto;
}

.timeline-scroll::-webkit-scrollbar {
  height: 6px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.3);
  border-radius: 10px;
}

.event-card {
  touch-action: none;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: ew-resize;
  z-index: 10;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.resize-handle-left {
  left: 0;
  border-radius: 12px 0 0 12px;
}

.resize-handle-right {
  right: 0;
  border-radius: 0 12px 12px 0;
}

div::-webkit-scrollbar {
  display: none;
}
`}
</style>

      {previewTimes && (draggingEvent || resizingEvent) && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 1000,
          pointerEvents: "none",
          fontWeight: 600,
          fontSize: 18,
          textAlign: "center",
          backdropFilter: "blur(10px)",
          border: "2px solid rgba(255,255,255,0.2)"
        }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
            {resizingEvent ? "Resizing" : "Moving"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {formatTime(previewTimes.start)} – {formatTime(previewTimes.end)}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
            {Math.round((previewTimes.end - previewTimes.start) / 60000)} minutes
          </div>
        </div>
      )}

      <div style={{
        background: "rgba(15, 12, 41, 0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "12px 16px",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
                Timeline
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                {monthYear}
              </p>
            </div>
            
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setShowTodoPanel(!showTodoPanel)}
                style={{
                  background: showTodoPanel ? "rgba(102, 126, 234, 0.3)" : "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#fff",
                  fontWeight: 500
                }}
              >
                📝
              </button>
              
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                style={{
                  background: showCalculator ? "rgba(102, 126, 234, 0.3)" : "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#fff",
                  fontWeight: 500
                }}
              >
                🔢
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#fff"
                }}
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 8,
              color: "#fca5a5",
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13
            }}>
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#fca5a5",
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>
          )}

          {mobileMenuOpen && (
            <div style={{
              marginTop: 12,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: "12px",
              animation: "slideDown 0.2s ease-out"
            }}>
              <input
                type="text"
                placeholder="🔍 Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  marginBottom: 12,
                  boxSizing: "border-box"
                }}
              />

              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button
                  onClick={() => { setSpaceId(PERSONAL_SPACE_ID); setMobileMenuOpen(false); }}
                  style={{
                    flex: 1,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: spaceId === PERSONAL_SPACE_ID 
                      ? "linear-gradient(135deg, #667eea, #764ba2)" 
                      : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Personal
                </button>

                <button
                  onClick={() => { 
                    if (familySpaceId) {
                      setSpaceId(familySpaceId);
                      setMobileMenuOpen(false);
                    } else {
                      createFamilySpace();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: spaceId === familySpaceId 
                      ? "linear-gradient(135deg, #667eea, #764ba2)" 
                      : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {familySpaceId ? "Family" : "+ Family"}
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                  Categories
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setFilterCategory("All")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: filterCategory === "All" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    All
                  </button>
                  {CATEGORIES.map(cat => {
                    const catStyle = CATEGORY_COLORS[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: filterCategory === cat ? catStyle.light : "rgba(255,255,255,0.05)",
                          color: filterCategory === cat ? catStyle.text : "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {["day", "week", "month", "year"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setViewMode(mode); setMobileMenuOpen(false); }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: "none",
                      background: viewMode === mode 
                        ? "linear-gradient(135deg, #667eea, #764ba2)" 
                        : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize"
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button 
                  onClick={() => {
                    if (viewMode === "month") goToPreviousMonth();
                    else if (viewMode === "week") goToPreviousWeek();
                    else goToPreviousDay();
                  }}
                  style={{ 
                    flex: 1,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff"
                  }}
                >
                  ←
                </button>
                
                <button 
                  onClick={() => { goToToday(); setMobileMenuOpen(false); }}
                  style={{ 
                    flex: 2,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff"
                  }}
                >
                  Today
                </button>

                <button 
                  onClick={() => {
                    if (viewMode === "month") goToNextMonth();
                    else if (viewMode === "week") goToNextWeek();
                    else goToNextDay();
                  }}
                  style={{ 
                    flex: 1,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff"
                  }}
                >
                  →
                </button>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { openNewEvent(); }}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  + Event
                </button>

                <button
                  onClick={() => { setShowDeletedOverlay(true); setMobileMenuOpen(false); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#fff"
                  }}
                >
                  🗑️
                </button>

                <button
                  onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#fff"
                  }}
                >
                  ⚙️
                </button>

                <button
                  onClick={() => signOut(auth)}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#fca5a5"
                  }}
                >
                  Exit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTodoPanel && (
        <div style={{
          position: "fixed",
          top: 70,
          right: 16,
          width: 300,
          maxHeight: "calc(100vh - 90px)",
          background: "rgba(15, 12, 41, 0.98)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          padding: 16,
          zIndex: 100,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>Quick Notes</h3>
            <button onClick={() => setShowTodoPanel(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyPress={e => e.key === "Enter" && addTodo()}
              placeholder="Add a note..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 14,
                outline: "none"
              }}
            />
            <button
              onClick={addTodo}
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14
              }}
            >
              +
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todos.map(todo => (
              <div key={todo.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 8,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)"
              }}>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{
                  flex: 1,
                  color: "#fff",
                  fontSize: 13,
                  textDecoration: todo.done ? "line-through" : "none",
                  opacity: todo.done ? 0.5 : 1
                }}>
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCalculator && (
        <div style={{
          position: "fixed",
          top: 70,
          right: showTodoPanel ? 332 : 16,
          width: 280,
          background: "rgba(15, 12, 41, 0.98)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          padding: 16,
          zIndex: 100,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>Calculator</h3>
            <button onClick={() => setShowCalculator(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>

          <div style={{
            background: "rgba(0,0,0,0.3)",
            padding: "16px",
            borderRadius: 8,
            marginBottom: 12,
            textAlign: "right",
            color: "#fff",
            fontSize: 24,
            fontWeight: 600,
            minHeight: 40,
            wordBreak: "break-all"
          }}>
            {calcDisplay}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", "C", "=", "+"].map(btn => (
              <button
                key={btn}
                onClick={() => handleCalc(btn)}
                style={{
                  padding: "16px",
                  borderRadius: 8,
                  border: "none",
                  background: ["÷", "×", "-", "+", "="].includes(btn) 
                    ? "linear-gradient(135deg, #667eea, #764ba2)" 
                    : btn === "C" 
                    ? "rgba(239, 68, 68, 0.3)" 
                    : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "20px", maxWidth: 1600, margin: "0 auto" }}>
        {loading ? (
          <div style={{
            padding: 60,
            textAlign: "center",
            color: "rgba(255,255,255,0.5)",
            fontSize: 15
          }}>
            Loading your timeline...
          </div>
        ) : viewMode === "day" ? (
          <div style={{ 
            background: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div ref={timelineRef} className="timeline-scroll" style={{ overflowX: "auto" }} onClick={handleTimelineClick}>
              <div style={{ position: "relative", width: DAY_WIDTH, minHeight: 400, padding: "20px 0" }}>
                {[...Array(96)].map((_, i) => {
                  const isHour = i % 4 === 0;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: i * 15 * PIXELS_PER_MINUTE,
                        top: 0,
                        bottom: 0,
                        width: isHour ? 2 : 1,
                        background: isHour ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
                        zIndex: 1
                      }}
                    />
                  );
                })}

                {[...Array(24)].map((_, h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      left: h * 60 * PIXELS_PER_MINUTE + 8,
                      top: 12,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      fontWeight: 700,
                      background: "rgba(15, 12, 41, 0.9)",
                      padding: "4px 8px",
                      borderRadius: 6,
                      pointerEvents: "none",
                      zIndex: 2,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                    }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}

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
                      boxShadow: "0 0 20px rgba(102, 126, 234, 0.8)",
                      borderRadius: 2,
                      pointerEvents: "none"
                    }} />
                    <div style={{
                      position: "absolute",
                      left: nowLeft - 6,
                      top: 8,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      zIndex: 11,
                      pointerEvents: "none",
                      animation: "glow 2s ease-in-out infinite"
                    }} />
                  </>
                )}

                {stacked.length === 0 && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 15,
                    pointerEvents: "none"
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
                    <div style={{ fontWeight: 600 }}>No events today</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Click timeline to create</div>
                  </div>
                )}

                {stacked.map(ev => {
                  const width = toLeft(ev.end) - toLeft(ev.start);
                  const isSmall = width < 180;
                  const isDragging = draggingEvent?.id === ev.id;
                  const isResizing = resizingEvent?.id === ev.id;
                  const catStyle = CATEGORY_COLORS[ev.category || "Personal"];
                  
                  return (
                    <div
                      key={ev.id}
                      data-event-id={ev.id}
                      className="event-card"
                      onMouseDown={(e) => {
                        if (e.target.classList.contains('resize-handle')) return;
                        handleDragStart(e, ev);
                      }}
                      onTouchStart={(e) => {
                        if (e.target.classList.contains('resize-handle')) return;
                        handleDragStart(e, ev);
                      }}
                      onClick={(e) => {
                        if (e.target.classList.contains('resize-handle')) return;
                        e.stopPropagation();
                        if (Math.abs(e.clientX - dragStartX) < 5) {
                          openEditEvent(ev);
                        }
                      }}
                      style={{
                        position: "absolute",
                        left: toLeft(ev.start),
                        top: 70 + ev.row * (EVENT_HEIGHT + ROW_GAP),
                        width,
                        height: EVENT_HEIGHT,
                        background: (isDragging || isResizing)
                          ? "linear-gradient(135deg, #818cf8, #9333ea)" 
                          : catStyle.bg,
                        color: "#fff",
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: isDragging ? "grabbing" : "grab",
                        boxShadow: (isDragging || isResizing)
                          ? "0 12px 35px rgba(102, 126, 234, 0.5)" 
                          : "0 4px 15px rgba(0,0,0,0.3)",
                        transition: (isDragging || isResizing) ? "none" : "all 0.2s ease",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.1)",
                        opacity: (isDragging || isResizing) ? 0.7 : 1,
                        zIndex: (isDragging || isResizing) ? 100 : 5,
                        boxSizing: "border-box"
                      }}
                      onMouseEnter={e => {
                        if (!isDragging && !isResizing) {
                          e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                          e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isDragging && !isResizing) {
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                          e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
                        }
                      }}
                    >
                      <div
                        className="resize-handle resize-handle-left"
                        onMouseDown={(e) => handleResizeStart(e, ev, 'left')}
                        onTouchStart={(e) => handleResizeStart(e, ev, 'left')}
                      />
                      
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: isSmall ? 13 : 15,
                        marginBottom: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        pointerEvents: "none"
                      }}>
                        {ev.title}
                      </div>
                      {!isSmall && (
                        <div style={{ fontSize: 12, opacity: 0.9, pointerEvents: "none" }}>
                          {formatTime(ev.start)} – {formatTime(ev.end)}
                        </div>
                      )}
                      
                      <div
                        className="resize-handle resize-handle-right"
                        onMouseDown={(e) => handleResizeStart(e, ev, 'right')}
                        onTouchStart={(e) => handleResizeStart(e, ev, 'right')}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === "week" ? (
          <div style={{ 
            background: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "16px"
          }}>
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12
            }}>
              {weekDays.map((day, index) => {
                const dayEventsForWeek = filteredEvents.filter(ev => 
                  ev.start.toDateString() === day.toDateString()
                );
                const isDayToday = day.toDateString() === now.toDateString();
    
                return (
                  <div
                    key={index}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      minHeight: 180
                    }}
                    onClick={() => goToDate(day)}
                  >
                    <div style={{ 
                      textAlign: "center", 
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottom: "1px solid rgba(255,255,255,0.1)"
                    }}>
                      <div style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: 6,
                        letterSpacing: "0.5px"
                      }}>
                        {day.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
                      </div>
                      <div 
                        style={{ 
                          fontSize: 22, 
                          fontWeight: 700,
                          color: isDayToday ? "#fff" : "rgba(255,255,255,0.9)",
                          background: isDayToday ? "linear-gradient(135deg, #667eea, #764ba2)" : "transparent",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto"
                        }}
                      >
                        {day.getDate()}
                      </div>
                    </div>
  
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dayEventsForWeek.length === 0 ? (
                        <div style={{ 
                          textAlign: "center", 
                          color: "rgba(255,255,255,0.2)", 
                          fontSize: 11,
                          padding: "16px 0",
                          fontWeight: 500
                        }}>
                          No events
                        </div>
                      ) : (
                        dayEventsForWeek.slice(0, 3).map(ev => {
                          const catStyle = CATEGORY_COLORS[ev.category || "Personal"];
                          return (
                            <div
                              key={ev.id}
                              style={{
                                background: catStyle.bg,
                                color: "#fff",
                                padding: "6px 8px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEvent(ev);
                              }}
                            >
                              {ev.title}
                            </div>
                          );
                        })
                      )}
                      {dayEventsForWeek.length > 3 && (
                        <div style={{ 
                          fontSize: 9, 
                          color: "rgba(255,255,255,0.4)", 
                          textAlign: "center",
                          fontWeight: 600
                        }}>
                          +{dayEventsForWeek.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === "month" ? (
          <div style={{ 
            background: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            maxWidth: 600,
            margin: "0 auto"
          }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(7, 1fr)", 
              gap: 6,
              marginBottom: 12
            }}>
              {weekDayHeaders.map((day, i) => (
                <div key={i} style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  padding: "4px 0"
                }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(7, 1fr)", 
              gap: 6
            }}>
              {monthDays.map((day, index) => {
                const isCurrentDay = day && day.toDateString() === now.toDateString();
                
                return (
                  <div
                    key={index}
                    onClick={() => day && goToDate(day)}
                    style={{
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      background: day ? (isCurrentDay ? "linear-gradient(135deg, #667eea, #764ba2)" : "rgba(255,255,255,0.03)") : "transparent",
                      color: day ? (isCurrentDay ? "#fff" : "rgba(255,255,255,0.9)") : "transparent",
                      fontWeight: isCurrentDay ? 700 : 500,
                      fontSize: 13,
                      cursor: day ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      border: day ? "1px solid rgba(255,255,255,0.1)" : "none",
                      minHeight: 40
                    }}
                    onMouseEnter={e => {
                      if (day && !isCurrentDay) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                        e.currentTarget.style.fontWeight = "600";
                      }
                    }}
                    onMouseLeave={e => {
                      if (day && !isCurrentDay) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.fontWeight = "500";
                      }
                    }}
                  >
                    {day ? day.getDate() : ""}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 16
          }}>
            {yearMonths.map((month, idx) => {
              const monthDaysArray = getDaysInMonth(month);
              
              return (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    padding: "16px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onClick={() => {
                    setCurrentDate(month);
                    setViewMode("month");
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <h4 style={{
                    margin: "0 0 12px 0",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                    textAlign: "center"
                  }}>
                    {month.toLocaleDateString(undefined, { month: "long" })}
                  </h4>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 4,
                    marginBottom: 8
                  }}>
                    {weekDayHeaders.map((day, i) => (
                      <div key={i} style={{
                        textAlign: "center",
                        fontSize: 9,
                        color: "rgba(255,255,255,0.4)",
                        fontWeight: 600
                      }}>
                        {day}
                      </div>
                    ))}
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 4
                  }}>
                    {monthDaysArray.map((day, i) => {
                      const isCurrentDay = day && day.toDateString() === now.toDateString();
                      return (
                        <div
                          key={i}
                          style={{
                            aspectRatio: "1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            borderRadius: 4,
                            background: day ? (isCurrentDay ? "linear-gradient(135deg, #667eea, #764ba2)" : "rgba(255,255,255,0.05)") : "transparent",
                            color: day ? (isCurrentDay ? "#fff" : "rgba(255,255,255,0.7)") : "transparent",
                            fontWeight: isCurrentDay ? 700 : 500
                          }}
                        >
                          {day ? day.getDate() : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDeletedOverlay && (
        <Overlay title="Recently Deleted" onClose={() => setShowDeletedOverlay(false)}>
          {deletedEvents.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <div>No deleted events</div>
            </div>
          ) : (
            deletedEvents.map(ev => (
              <div key={ev.id} style={{
                padding: "16px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#fff" }}>
                  {ev.title}
                </div>
                {ev.deletedAt && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
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
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                  }}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </Overlay>
      )}

      {showSettings && (
        <Overlay title="Settings" onClose={() => setShowSettings(false)}>
          <div style={{ padding: "16px 0" }}>
            <div style={{
              padding: "16px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#fff", marginBottom: 4 }}>
                    Week Starts On
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    Choose whether your week starts on Sunday or Monday
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setWeekStartsOnMonday(false)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: weekStartsOnMonday ? "2px solid rgba(255,255,255,0.1)" : "2px solid #667eea",
                    background: weekStartsOnMonday ? "rgba(255,255,255,0.05)" : "rgba(102, 126, 234, 0.2)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  Sunday
                </button>
                
                <button
                  onClick={() => setWeekStartsOnMonday(true)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: weekStartsOnMonday ? "2px solid #667eea" : "2px solid rgba(255,255,255,0.1)",
                    background: weekStartsOnMonday ? "rgba(102, 126, 234, 0.2)" : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  Monday
                </button>
              </div>
            </div>

            <div style={{
              padding: "20px 0",
              textAlign: "center",
              color: "rgba(255,255,255,0.3)",
              fontSize: 13
            }}>
              More customization options coming soon...
            </div>
          </div>
        </Overlay>
      )}

      {showInviteModal && (
        <Overlay title="Family Space Invite" onClose={() => setShowInviteModal(false)}>
          <div style={{ padding: "16px 0" }}>
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
                Share this code with family members:
              </div>
              <div style={{
                background: "rgba(102, 126, 234, 0.2)",
                padding: "16px",
                borderRadius: 12,
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "4px",
                fontFamily: "monospace",
                border: "2px dashed rgba(102, 126, 234, 0.4)"
              }}>
                {inviteCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode);
                  alert("Code copied to clipboard!");
                }}
                style={{
                  marginTop: 12,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                📋 Copy Code
              </button>
            </div>

            <div style={{ 
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: 20
            }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
                Or enter a code to join:
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter code..."
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: 15,
                    fontFamily: "monospace",
                    letterSpacing: "2px",
                    outline: "none"
                  }}
                />
                <button
                  onClick={() => joinFamilySpace(inviteCode)}
                  style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 24px",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
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
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            overflow: "hidden",
            maxHeight: "90vh",
            overflowY: "auto",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#fff" }}>
                {editingEvent ? "Edit Event" : "New Event"}
              </h3>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                  Event Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What's happening?"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 16,
                    fontFamily: "inherit",
                    outline: "none",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    transition: "border 0.2s ease",
                    boxSizing: "border-box"
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                  Category
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CATEGORIES.map(cat => {
                    const catStyle = CATEGORY_COLORS[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setEventCategory(cat)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: eventCategory === cat ? `2px solid ${catStyle.text}` : "2px solid rgba(255,255,255,0.1)",
                          background: eventCategory === cat ? catStyle.light : "rgba(255,255,255,0.05)",
                          color: eventCategory === cat ? catStyle.text : "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: 15,
                      fontFamily: "inherit",
                      background: "rgba(255,255,255,0.05)",
                      color: "#fff",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: 15,
                      fontFamily: "inherit",
                      background: "rgba(255,255,255,0.05)",
                      color: "#fff",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                display: "flex", 
                gap: 12, 
                marginTop: 8,
                flexWrap: "wrap"
              }}>
                <button
                  onClick={saveEvent}
                  disabled={loading}
                  style={{
                    background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 32px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 16,
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    flex: 1,
                    minWidth: 120
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "14px 32px",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#fff",
                    flex: 1,
                    minWidth: 120
                  }}
                >
                  Cancel
                </button>

                {editingEvent && (
                  <>
                    <button
                      onClick={() => {
                        duplicateEvent(editingEvent);
                        setShowModal(false);
                      }}
                      style={{
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        borderRadius: 12,
                        padding: "14px 32px",
                        cursor: "pointer",
                        color: "#60a5fa",
                        fontWeight: 600,
                        fontSize: 16,
                        width: "100%"
                      }}
                    >
                      📋 Duplicate
                    </button>
                    
                    <button
                      onClick={deleteEvent}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: 12,
                        padding: "14px 32px",
                        cursor: "pointer",
                        color: "#fca5a5",
                        fontWeight: 600,
                        fontSize: 16,
                        width: "100%"
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "rgba(15, 12, 41, 0.98)",
        width: "100%",
        maxWidth: 440,
        maxHeight: "85vh",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.1)",
              fontSize: 18,
              cursor: "pointer",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
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