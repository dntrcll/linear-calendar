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

// MODERN BLUE-CYAN THEME
const EVENT_COLORS = {
  blue: { bg: "linear-gradient(135deg, #3B82F6, #2563EB)", border: "#3B82F6", dot: "#3B82F6" },
  teal: { bg: "linear-gradient(135deg, #14B8A6, #0D9488)", border: "#14B8A6", dot: "#14B8A6" },
  green: { bg: "linear-gradient(135deg, #10B981, #059669)", border: "#10B981", dot: "#10B981" },
  purple: { bg: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "#8B5CF6", dot: "#8B5CF6" },
  amber: { bg: "linear-gradient(135deg, #F59E0B, #D97706)", border: "#F59E0B", dot: "#F59E0B" },
  orange: { bg: "linear-gradient(135deg, #F97316, #EA580C)", border: "#F97316", dot: "#F97316" },
  red: { bg: "linear-gradient(135deg, #EF4444, #DC2626)", border: "#EF4444", dot: "#EF4444" },
  cyan: { bg: "linear-gradient(135deg, #06B6D4, #0891B2)", border: "#06B6D4", dot: "#06B6D4" },
};

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "blue" },
  { id: "project", name: "Project", color: "teal" },
  { id: "deadline", name: "Deadline", color: "red" },
  { id: "personal", name: "Personal", color: "amber" },
  { id: "travel", name: "Travel", color: "orange" },
  { id: "health", name: "Health", color: "cyan" },
];

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT";
  
  const MOTIVATIONAL_QUOTES = [
    "Every day is a fresh start.",
    "Small progress is still progress.",
    "You're doing better than you think.",
    "Focus on what you can control.",
    "One step at a time.",
    "Your future self will thank you.",
    "Make today count.",
    "Progress over perfection.",
    "You've got this.",
    "Consistency beats intensity.",
    "Trust the process.",
    "Your only limit is you.",
    "Dream big, start small.",
    "Do it with passion or not at all.",
    "Success is a journey, not a destination.",
    "Be the energy you want to attract.",
    "Believe you can and you're halfway there.",
    "The best time to start was yesterday. The next best time is now."
  ];
  
  const getMotivationalQuote = () => {
    const hours = new Date().getHours();
    const index = Math.floor(hours / 4) % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[index];
  };
  
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId, setSpaceId] = useState(PERSONAL_SPACE_ID);
  const [familySpaceId, setFamilySpaceId] = useState(null);

  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("Work");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  const [viewMode, setViewMode] = useState("day");
  
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("blue");
  
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);
  
  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(() => {
    const saved = localStorage.getItem('weekStartsOnMonday');
    return saved ? JSON.parse(saved) : false;
  });

  const [yearViewLayout, setYearViewLayout] = useState(() => {
    const saved = localStorage.getItem('yearViewLayout');
    return saved || 'linear';
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [blurPastDates, setBlurPastDates] = useState(() => {
    const saved = localStorage.getItem('blurPastDates');
    return saved ? JSON.parse(saved) : false;
  });

  const [quickNotes, setQuickNotes] = useState(() => {
    const saved = localStorage.getItem('quickNotes');
    return saved || '';
  });

  const [hoveredDateEvents, setHoveredDateEvents] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [use24HourFormat, setUse24HourFormat] = useState(() => {
    const saved = localStorage.getItem('use24HourFormat');
    return saved ? JSON.parse(saved) : false;
  });

  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('showSidebar');
    return saved ? JSON.parse(saved) : true;
  });

  const [sidebarNotes, setSidebarNotes] = useState(() => {
    const saved = localStorage.getItem('sidebarNotes');
    return saved || '';
  });

  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeft, setDragStartLeft] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  
  const timelineRef = useRef(null);
  const isSavingRef = useRef(false);

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
  }, [currentDate, viewMode]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

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

  useEffect(() => {
    localStorage.setItem('yearViewLayout', yearViewLayout);
  }, [yearViewLayout]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.style.background = "#0F172A";
    } else {
      document.body.style.background = "#f8fafc";
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('blurPastDates', JSON.stringify(blurPastDates));
  }, [blurPastDates]);

  useEffect(() => {
    localStorage.setItem('use24HourFormat', JSON.stringify(use24HourFormat));
  }, [use24HourFormat]);

  useEffect(() => {
    localStorage.setItem('showSidebar', JSON.stringify(showSidebar));
  }, [showSidebar]);

  useEffect(() => {
    localStorage.setItem('sidebarNotes', sidebarNotes);
  }, [sidebarNotes]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    if (selectedYear !== year) {
      setCurrentDate(new Date(selectedYear, currentDate.getMonth(), currentDate.getDate()));
    }
  }, [selectedYear]);

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

  const addCategory = () => {
    if (!newCategoryName.trim()) {
      setError("Category name cannot be empty");
      return;
    }
    
    const newCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      color: newCategoryColor
    };
    
    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryColor("blue");
    setShowAddCategoryModal(false);
  };
  
  const deleteCategory = (categoryId) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };
  
  const handleCategoryDragStart = (e, categoryId) => {
    setDraggingCategoryId(categoryId);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  
  const handleCategoryDrop = (e, targetCategoryId) => {
    e.preventDefault();
    
    if (draggingCategoryId === targetCategoryId) {
      setDraggingCategoryId(null);
      return;
    }
    
    const draggedIndex = categories.findIndex(cat => cat.id === draggingCategoryId);
    const targetIndex = categories.findIndex(cat => cat.id === targetCategoryId);
    
    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);
    
    setCategories(newCategories);
    setDraggingCategoryId(null);
  };

  const openNewEvent = (presetStart = null, presetEnd = null) => {
    setEditingEvent(null);
    setTitle("");
    setEventCategory("Work");
    
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
  };

  const openEditEvent = ev => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setStartTime(ev.start.toISOString().slice(0, 16));
    setEndTime(ev.end.toISOString().slice(0, 16));
    setEventCategory(ev.category || "Work");
    setShowModal(true);
  };

  const duplicateEvent = async (ev) => {
    try {
      const newStart = new Date(ev.start);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(ev.end);
      newEnd.setDate(newEnd.getDate() + 1);

      const category = ev.category || "Work";
      const categoryColor = categories.find(c => c.name === category)?.color || "blue";

      const ref = await addDoc(collection(db, "events"), {
        spaceId,
        title: ev.title + " (Copy)",
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        color: categoryColor,
        category: category,
        deleted: false,
        createdAt: serverTimestamp(),
      });
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

    const categoryColor = categories.find(c => c.name === eventCategory)?.color || "blue";

    try {
      setLoading(true);
      setError(null);

      if (editingEvent) {
        await updateDoc(doc(db, "events", editingEvent.id), {
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
          color: categoryColor,
          category: eventCategory,
        });
      } else {
        await addDoc(collection(db, "events"), {
          spaceId,
          title,
          startTime: Timestamp.fromDate(startDate),
          endTime: Timestamp.fromDate(endDate),
          color: categoryColor,
          category: eventCategory,
          deleted: false,
          createdAt: serverTimestamp(),
        });
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
      await loadEvents();
    } catch (err) {
      console.error("Error restoring event:", err);
      setError("Failed to restore event.");
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
    
    const eventLeft = toLeft(ev.start);
    const eventWidth = toLeft(ev.end) - toLeft(ev.start);
    
    setDragStartLeft(eventLeft);
    setDragStartWidth(eventWidth);
  };

  const handleResizeMove = (e) => {
    if (!resizingEvent) return;
    
    e.preventDefault();
    const timeline = timelineRef.current;
    if (!timeline) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX;
    
    const eventElement = document.querySelector(`[data-event-id="${resizingEvent.id}"]`);
    if (!eventElement) return;
    
    if (resizeHandle === 'left') {
      const newLeft = Math.round((dragStartLeft + deltaX) / (SNAP_MINUTES * PIXELS_PER_MINUTE)) * (SNAP_MINUTES * PIXELS_PER_MINUTE);
      const newWidth = dragStartLeft + dragStartWidth - newLeft;
      
      if (newWidth >= MIN_EVENT_DURATION * PIXELS_PER_MINUTE && newLeft >= 0) {
        eventElement.style.left = `${newLeft}px`;
        eventElement.style.width = `${newWidth}px`;
      }
    } else {
      const newWidth = Math.round((dragStartWidth + deltaX) / (SNAP_MINUTES * PIXELS_PER_MINUTE)) * (SNAP_MINUTES * PIXELS_PER_MINUTE);
      
      if (newWidth >= MIN_EVENT_DURATION * PIXELS_PER_MINUTE && dragStartLeft + newWidth <= DAY_WIDTH) {
        eventElement.style.width = `${newWidth}px`;
      }
    }
    
    eventElement.style.opacity = '0.7';
  };

  const handleResizeEnd = async (e) => {
    if (!resizingEvent) return;
    
    const eventElement = document.querySelector(`[data-event-id="${resizingEvent.id}"]`);
    if (!eventElement) return;
    
    const finalLeft = parseFloat(eventElement.style.left);
    const finalWidth = parseFloat(eventElement.style.width);
    
    const newStartMinutes = finalLeft / PIXELS_PER_MINUTE;
    const newEndMinutes = (finalLeft + finalWidth) / PIXELS_PER_MINUTE;
    
    const originalEventDate = new Date(resizingEvent.start);
    originalEventDate.setHours(0, 0, 0, 0);
    
    const newStart = new Date(originalEventDate.getTime() + newStartMinutes * 60000);
    const newEnd = new Date(originalEventDate.getTime() + newEndMinutes * 60000);
    
    const currentScrollPosition = timelineRef.current?.scrollLeft;
    isSavingRef.current = true;
    
    try {
      await updateDoc(doc(db, "events", resizingEvent.id), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      });
      
      await loadEvents();
      
      setTimeout(() => {
        if (timelineRef.current && currentScrollPosition !== null) {
          timelineRef.current.scrollLeft = currentScrollPosition;
        }
        isSavingRef.current = false;
      }, 50);
      
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to resize event");
      await loadEvents();
      isSavingRef.current = false;
    }
    
    setResizingEvent(null);
    setResizeHandle(null);
    setDragStartX(0);
    setDragStartLeft(0);
    setDragStartWidth(0);
  };

  const handleDragStart = (e, ev) => {
    e.stopPropagation();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    setDraggingEvent(ev);
    setDragStartX(clientX);
    
    const eventLeft = toLeft(ev.start);
    const eventWidth = toLeft(ev.end) - toLeft(ev.start);
    
    setDragStartLeft(eventLeft);
    setDragStartWidth(eventWidth);
  };

  const handleDragMove = (e) => {
    if (!draggingEvent) return;
    
    e.preventDefault();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX;
    
    const newLeft = Math.round((dragStartLeft + deltaX) / (SNAP_MINUTES * PIXELS_PER_MINUTE)) * (SNAP_MINUTES * PIXELS_PER_MINUTE);
    
    const clampedLeft = Math.max(0, Math.min(newLeft, DAY_WIDTH - dragStartWidth));
    
    const eventElement = document.querySelector(`[data-event-id="${draggingEvent.id}"]`);
    if (eventElement) {
      eventElement.style.left = `${clampedLeft}px`;
      eventElement.style.opacity = '0.7';
      eventElement.style.cursor = 'grabbing';
    }
  };

  const handleDragEnd = async (e) => {
    if (!draggingEvent) return;
    
    const eventElement = document.querySelector(`[data-event-id="${draggingEvent.id}"]`);
    if (!eventElement) return;
    
    const finalLeft = parseFloat(eventElement.style.left);
    
    const newStartMinutes = finalLeft / PIXELS_PER_MINUTE;
    const durationMinutes = dragStartWidth / PIXELS_PER_MINUTE;
    
    const originalEventDate = new Date(draggingEvent.start);
    originalEventDate.setHours(0, 0, 0, 0);
    
    const newStart = new Date(originalEventDate.getTime() + newStartMinutes * 60000);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    
    const currentScrollPosition = timelineRef.current?.scrollLeft;
    isSavingRef.current = true;
    
    try {
      await updateDoc(doc(db, "events", draggingEvent.id), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      });
      
      await loadEvents();
      
      setTimeout(() => {
        if (timelineRef.current && currentScrollPosition !== null) {
          timelineRef.current.scrollLeft = currentScrollPosition;
        }
        isSavingRef.current = false;
      }, 50);
      
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to reschedule event");
      await loadEvents();
      isSavingRef.current = false;
    }
    
    setDraggingEvent(null);
    setDragStartX(0);
    setDragStartLeft(0);
    setDragStartWidth(0);
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
  }, [draggingEvent, resizingEvent]);

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
  
  const getAllDaysInYear = (year) => {
    const days = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const weekday = today.toLocaleDateString(undefined, { weekday: "long" });
  const dayDate = today.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const monthYear = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const nowLeft = toLeft(now);
  const isToday = today.toDateString() === now.toDateString();

  const weekDayHeaders = weekStartsOnMonday 
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  const monthDays = getDaysInMonth(currentDate);
  const weekDays = getWeekDays(currentDate);
  const yearDays = getAllDaysInYear(currentDate.getFullYear());
  
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
        background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        padding: 20
      }}>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.98)", padding: "48px 32px", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, background: "linear-gradient(135deg, #3B82F6, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Timeline</h1>
          <p style={{ color: "#6b7280", marginBottom: 32, fontSize: 16 }}>Your life, beautifully organized</p>
          <button 
            onClick={() => signInWithPopup(auth, provider)}
            style={{
              background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
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
      background: darkMode 
        ? "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" 
        : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      paddingBottom: "24px",
      transition: "background 0.3s ease"
    }}>
      <style>
{`
@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4);
  }
}

@keyframes dayPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
  }
}

.timeline-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: auto;
}

.timeline-scroll::-webkit-scrollbar {
  display: none;
}

* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
}

input, button, textarea {
  -webkit-appearance: none;
  appearance: none;
  user-select: text;
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

.current-day-pulse {
  animation: dayPulse 2s ease-in-out infinite;
}

div::-webkit-scrollbar {
  display: none;
}
`}
</style>

      {/* COMPACT MODERN HEADER */}
      <div style={{
        background: darkMode 
          ? "rgba(15, 23, 42, 0.95)" 
          : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: darkMode 
          ? "1px solid rgba(148, 163, 184, 0.1)" 
          : "1px solid rgba(0,0,0,0.06)",
        padding: "12px 20px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: darkMode 
          ? "0 4px 24px rgba(0, 0, 0, 0.4)" 
          : "0 4px 12px rgba(0,0,0,0.05)"
      }}>
        <div style={{ maxWidth: showSidebar ? 1200 : 1600, margin: "0 auto" }}>
          
          {/* Row 1: Brand + Month/Year + Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: 22, 
                fontWeight: 800, 
                background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px"
              }}>
                Timeline
              </h2>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 700,
                color: darkMode ? "#94a3b8" : "#64748b"
              }}>
                {monthYear}
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => openNewEvent()}
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  transition: "all 0.2s ease"
                }}
              >
                + Event
              </button>

              <button
                onClick={() => setShowDeletedOverlay(true)}
                style={{
                  background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: darkMode ? "#f1f5f9" : "#64748b",
                  transition: "all 0.2s ease"
                }}
              >
                🗑️ {deletedEvents.length > 0 && `(${deletedEvents.length})`}
              </button>

              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  color: darkMode ? "#94a3b8" : "#64748b",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ⚙️
              </button>
              
              <button
                onClick={() => signOut(auth)}
                style={{
                  background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontWeight: 600,
                  transition: "all 0.2s ease"
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Row 2: Search + Spaces + Categories */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="🔍 Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: "1 1 200px",
                minWidth: 200,
                padding: "10px 14px",
                borderRadius: 10,
                border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff",
                color: darkMode ? "#f1f5f9" : "#0f172a",
                transition: "border 0.2s ease"
              }}
            />

            <button
              onClick={() => setSpaceId(PERSONAL_SPACE_ID)}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: spaceId === PERSONAL_SPACE_ID 
                  ? "linear-gradient(135deg, #3B82F6, #06B6D4)" 
                  : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                color: spaceId === PERSONAL_SPACE_ID ? "#fff" : (darkMode ? "#94a3b8" : "#475569"),
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Personal
            </button>

            <button
              onClick={() => familySpaceId ? setSpaceId(familySpaceId) : createFamilySpace()}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: spaceId === familySpaceId 
                  ? "linear-gradient(135deg, #3B82F6, #06B6D4)" 
                  : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                color: spaceId === familySpaceId ? "#fff" : (darkMode ? "#94a3b8" : "#475569"),
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {familySpaceId ? "Family" : "+ Family"}
            </button>

            <div style={{ width: 1, height: 24, background: darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0" }} />

            <button
              onClick={() => setFilterCategory("All")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                background: filterCategory === "All" ? (darkMode ? "#1e3a8a" : "#eef2ff") : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
                color: filterCategory === "All" ? (darkMode ? "#fff" : "#4338ca") : (darkMode ? "#94a3b8" : "#64748b"),
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              All
            </button>
            
            {categories.slice(0, 4).map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.name)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  background: filterCategory === cat.name ? (darkMode ? "#1e3a8a" : "#eef2ff") : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
                  color: filterCategory === cat.name ? (darkMode ? "#fff" : "#4338ca") : (darkMode ? "#94a3b8" : "#64748b"),
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: (EVENT_COLORS[cat.color] || EVENT_COLORS.blue).dot
                }} />
                {cat.name}
              </button>
            ))}
            
            {categories.length > 4 && (
              <button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px dashed #cbd5e1",
                  background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff",
                  color: darkMode ? "#94a3b8" : "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                +{categories.length - 4}
              </button>
            )}
          </div>

          {/* Row 3: View Mode + Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setViewMode("day")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: viewMode === "day" 
                    ? "linear-gradient(135deg, #3B82F6, #06B6D4)" 
                    : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                  color: viewMode === "day" ? "#fff" : (darkMode ? "#94a3b8" : "#475569"),
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Day
              </button>

              <button
                onClick={() => setViewMode("week")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: viewMode === "week" 
                    ? "linear-gradient(135deg, #3B82F6, #06B6D4)" 
                    : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                  color: viewMode === "week" ? "#fff" : (darkMode ? "#94a3b8" : "#475569"),
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Week
              </button>

              <button
                onClick={() => setViewMode("month")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: viewMode === "month" 
                    ? "linear-gradient(135deg, #3B82F6, #06B6D4)" 
                    : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                  color: viewMode === "month" ? "#fff" : (darkMode ? "#94a3b8" : "#475569"),
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Month
              </button>
              
              <button
                onClick={() => setViewMode("year")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: viewMode === "year" 
                    ? "linear-gradient(135deg, #3B82F6, #06B6D4)" 
                    : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                  color: viewMode === "year" ? "#fff" : (darkMode ? "#94a3b8" : "#475569"),
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Year
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button 
                onClick={viewMode === "month" ? goToPreviousMonth : viewMode === "week" ? goToPreviousWeek : goToPreviousDay} 
                style={{ 
                  background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: darkMode ? "#f1f5f9" : "#475569"
                }}
              >
                ←
              </button>
              
              <button onClick={goToToday} disabled={isToday && viewMode === "day"} style={{ 
                background: (isToday && viewMode === "day") 
                  ? (darkMode ? "rgba(51, 65, 85, 0.3)" : "#e2e8f0") 
                  : (darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc"),
                border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: (isToday && viewMode === "day") ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: (isToday && viewMode === "day") 
                  ? (darkMode ? "#64748b" : "#94a3b8") 
                  : (darkMode ? "#f1f5f9" : "#475569")
              }}>
                Today
              </button>

              <button 
                onClick={viewMode === "month" ? goToNextMonth : viewMode === "week" ? goToNextWeek : goToNextDay} 
                style={{ 
                  background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                  border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: darkMode ? "#f1f5f9" : "#475569"
                }}
              >
                →
              </button>

              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: darkMode ? "#94a3b8" : "#64748b",
                marginLeft: 8
              }}>
                {viewMode === "week" 
                  ? `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                  : viewMode === "month"
                  ? currentDate.toLocaleDateString(undefined, { month: "long" })
                  : viewMode === "year"
                  ? currentDate.getFullYear()
                  : weekday + ", " + dayDate
                }
              </div>
              {isToday && viewMode === "day" && (
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
                  animation: "pulse 2s ease-in-out infinite"
                }} />
              )}
            </div>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#991b1b",
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
                  color: "#991b1b",
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ 
        maxWidth: showSidebar ? 1200 : 1600,
        margin: "0 auto",
        padding: "20px",
        marginRight: showSidebar ? 400 : "auto"
      }}>
        {loading ? (
          <div style={{
            padding: 60,
            textAlign: "center",
            color: darkMode ? "#94a3b8" : "#64748b",
            fontSize: 15
          }}>
            Loading your timeline...
          </div>
        ) : viewMode === "day" ? (
          <div style={{ 
            background: darkMode ? "rgba(30, 41, 59, 0.4)" : "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0"
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
                        background: darkMode 
                          ? (isHour ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.1)")
                          : (isHour ? "#cbd5e1" : "#f1f5f9"),
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
                      color: darkMode ? "#94a3b8" : "#475569",
                      fontWeight: 700,
                      background: darkMode ? "rgba(30, 41, 59, 0.8)" : "#fff",
                      padding: "4px 8px",
                      borderRadius: 6,
                      pointerEvents: "none",
                      zIndex: 2,
                      boxShadow: darkMode ? "0 2px 4px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.05)"
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
                      background: "linear-gradient(180deg, #3B82F6, #06B6D4)",
                      zIndex: 10,
                      boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
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
                      background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
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
                    color: darkMode ? "#64748b" : "#94a3b8",
                    fontSize: 15,
                    pointerEvents: "none"
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                    <div style={{ fontWeight: 600 }}>No events today</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Click timeline to create</div>
                  </div>
                )}

                {stacked.map(ev => {
                  const width = toLeft(ev.end) - toLeft(ev.start);
                  const isSmall = width < 180;
                  const isDragging = draggingEvent?.id === ev.id;
                  const isResizing = resizingEvent?.id === ev.id;
                  const colorStyle = EVENT_COLORS[ev.color || "blue"];
                  
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
                          ? "linear-gradient(135deg, #60A5FA, #34D399)" 
                          : colorStyle.bg,
                        color: "#fff",
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: isDragging ? "grabbing" : "grab",
                        boxShadow: (isDragging || isResizing)
                          ? "0 12px 35px rgba(59, 130, 246, 0.5)" 
                          : "0 4px 15px rgba(59, 130, 246, 0.3)",
                        transition: (isDragging || isResizing) ? "none" : "all 0.2s ease",
                        overflow: "hidden",
                        border: "none",
                        opacity: (isDragging || isResizing) ? 0.7 : 1,
                        zIndex: (isDragging || isResizing) ? 100 : 5
                      }}
                      onMouseEnter={e => {
                        if (!isDragging && !isResizing) {
                          e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                          e.currentTarget.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.4)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isDragging && !isResizing) {
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                          e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
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
            background: darkMode ? "rgba(30, 41, 59, 0.4)" : "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0"
          }}>
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 8,
              padding: "12px"
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
                      background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                      border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      minHeight: 200
                    }}
                    onClick={() => goToDate(day)}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = darkMode ? "0 8px 20px rgba(0,0,0,0.5)" : "0 8px 20px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ 
                      textAlign: "center", 
                      marginBottom: 16,
                      paddingBottom: 16,
                      borderBottom: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #f1f5f9"
                    }}>
                      <div style={{ 
                        fontSize: 12, 
                        fontWeight: 700, 
                        color: darkMode ? "#64748b" : "#94a3b8",
                        marginBottom: 8,
                        letterSpacing: "0.5px"
                      }}>
                        {day.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
                      </div>
                      <div 
                        className={isDayToday ? "current-day-pulse" : ""}
                        style={{ 
                          fontSize: 28, 
                          fontWeight: 700,
                          color: isDayToday ? "#fff" : (darkMode ? "#f1f5f9" : "#0f172a"),
                          background: isDayToday ? "linear-gradient(135deg, #3B82F6, #06B6D4)" : "transparent",
                          width: 48,
                          height: 48,
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
      
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {dayEventsForWeek.length === 0 ? (
                        <div style={{ 
                          textAlign: "center", 
                          color: darkMode ? "#64748b" : "#cbd5e1", 
                          fontSize: 12,
                          padding: "20px 0",
                          fontWeight: 500
                        }}>
                          No events
                        </div>
                      ) : (
                        dayEventsForWeek.slice(0, 3).map(ev => {
                          const colorStyle = EVENT_COLORS[ev.color || "blue"];
                          return (
                            <div
                              key={ev.id}
                              style={{
                                background: colorStyle.bg,
                                color: "#fff",
                                padding: "8px 10px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
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
                          fontSize: 10, 
                          color: darkMode ? "#94a3b8" : "#64748b", 
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
        ) : viewMode === "year" ? (
          <div style={{ 
            background: darkMode 
              ? "rgba(30, 41, 59, 0.4)" 
              : "#fff",
            borderRadius: 16,
            boxShadow: darkMode 
              ? "0 8px 32px rgba(0, 0, 0, 0.3)" 
              : "0 4px 20px rgba(0,0,0,0.08)",
            border: darkMode 
              ? "1px solid rgba(148, 163, 184, 0.1)" 
              : "1px solid #e2e8f0",
            overflow: "hidden",
            width: "100%",
            backdropFilter: darkMode ? "blur(10px)" : "none"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              padding: "20px",
              borderBottom: darkMode 
                ? "1px solid rgba(148, 163, 184, 0.1)" 
                : "2px solid #f1f5f9",
              background: darkMode 
                ? "rgba(15, 23, 42, 0.6)" 
                : "#fff",
              position: "sticky",
              top: 0,
              zIndex: 10,
              backdropFilter: "blur(8px)"
            }}>
              <button
                onClick={() => setSelectedYear(selectedYear - 1)}
                style={{
                  background: darkMode 
                    ? "rgba(51, 65, 85, 0.8)" 
                    : "#f8fafc",
                  border: darkMode 
                    ? "1px solid rgba(148, 163, 184, 0.2)" 
                    : "1px solid #e2e8f0",
                  borderRadius: 12,
                  width: 48,
                  height: 48,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ←
              </button>
              
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                minWidth: 140,
                textAlign: "center",
                letterSpacing: "-1px"
              }}>
                {selectedYear}
              </div>
              
              <button
                onClick={() => setSelectedYear(selectedYear + 1)}
                style={{
                  background: darkMode 
                    ? "rgba(51, 65, 85, 0.8)" 
                    : "#f8fafc",
                  border: darkMode 
                    ? "1px solid rgba(148, 163, 184, 0.2)" 
                    : "1px solid #e2e8f0",
                  borderRadius: 12,
                  width: 48,
                  height: 48,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                →
              </button>
            </div>

            <div style={{ 
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: "calc(100vh - 250px)"
            }}>
              <table style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 13
              }}>
                <thead style={{
                  position: "sticky",
                  top: 0,
                  background: darkMode 
                    ? "rgba(15, 23, 42, 0.95)" 
                    : "#fff",
                  zIndex: 5
                }}>
                  <tr>
                    <th style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
                      background: darkMode ? "rgba(30, 41, 59, 0.4)" : "#fafbfc",
                      fontWeight: 700,
                      color: darkMode ? "#CBD5E1" : "#64748b",
                      position: "sticky",
                      left: 0,
                      zIndex: 6
                    }}></th>
                    {[...Array(5)].flatMap((_, weekIdx) => 
                      (weekStartsOnMonday 
                        ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                        : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                      ).map((dayName, i) => (
                        <th key={`${weekIdx}-${i}`} style={{
                          padding: "12px 6px",
                          textAlign: "center",
                          borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
                          background: darkMode ? "rgba(30, 41, 59, 0.5)" : "#fafbfc",
                          fontWeight: 700,
                          color: darkMode ? "#94A3B8" : "#64748b",
                          fontSize: 12
                        }}>
                          {dayName}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                
                <tbody>
                  {[...Array(12)].map((_, monthIndex) => {
                    const monthDate = new Date(selectedYear, monthIndex, 1);
                    const monthName = monthDate.toLocaleDateString(undefined, { month: "short" });
                    
                    const firstDayOfWeek = monthDate.getDay();
                    const lastDay = new Date(selectedYear, monthIndex + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    
                    const startOffset = weekStartsOnMonday 
                      ? (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1)
                      : firstDayOfWeek;
                    
                    const cells = [];
                    
                    for (let i = 0; i < startOffset; i++) {
                      cells.push(null);
                    }
                    
                    for (let day = 1; day <= daysInMonth; day++) {
                      cells.push(new Date(selectedYear, monthIndex, day));
                    }
                    
                    while (cells.length < 35) {
                      cells.push(null);
                    }
                    
                    return (
                      <tr key={monthIndex}>
                        <td style={{
                          padding: "10px 18px",
                          borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
                          background: darkMode ? "rgba(30, 41, 59, 0.5)" : "#fafbfc",
                          fontWeight: 800,
                          color: "#3B82F6",
                          fontSize: 13,
                          position: "sticky",
                          left: 0,
                          zIndex: 1
                        }}>
                          {monthName}
                        </td>
                        
                        {cells.map((day, idx) => {
                          if (!day) {
                            return (
                              <td key={`empty-${idx}`} style={{
                                padding: "8px 4px",
                                borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.05)" : "1px solid #e2e8f0",
                                background: darkMode ? "rgba(15, 23, 42, 0.1)" : "#fff",
                                minWidth: 32,
                                textAlign: "center"
                              }}></td>
                            );
                          }
                          
                          const isToday = day.toDateString() === now.toDateString();
                          const isPast = day < now && !isToday;
                          const dayEvents = filteredEvents.filter(ev => 
                            ev.start.toDateString() === day.toDateString()
                          );
                          
                          return (
                            <td
                              key={idx}
                              onClick={() => goToDate(day)}
                              style={{
                                padding: "8px 4px",
                                borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.05)" : "1px solid #e2e8f0",
                                background: isToday
                                  ? "linear-gradient(135deg, #3B82F6, #06B6D4)"
                                  : darkMode
                                  ? "rgba(15, 23, 42, 0.2)"
                                  : "#fff",
                                cursor: "pointer",
                                textAlign: "center",
                                minWidth: 32,
                                transition: "all 0.15s ease",
                                position: "relative",
                                opacity: (blurPastDates && isPast) ? 0.3 : 1,
                                filter: (blurPastDates && isPast) ? "blur(1px)" : "none"
                              }}
                              onMouseEnter={e => {
                                if (dayEvents.length > 0) {
                                  setHoveredDateEvents(dayEvents);
                                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                                }
                                if (!isToday) {
                                  e.currentTarget.style.background = darkMode ? "rgba(59, 130, 246, 0.3)" : "#eef2ff";
                                  e.currentTarget.style.opacity = 1;
                                  e.currentTarget.style.filter = "none";
                                }
                              }}
                              onMouseMove={e => {
                                if (dayEvents.length > 0) {
                                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                                }
                              }}
                              onMouseLeave={e => {
                                setHoveredDateEvents(null);
                                if (!isToday) {
                                  e.currentTarget.style.background = darkMode ? "rgba(15, 23, 42, 0.2)" : "#fff";
                                  e.currentTarget.style.opacity = (blurPastDates && isPast) ? 0.3 : 1;
                                  e.currentTarget.style.filter = (blurPastDates && isPast) ? "blur(1px)" : "none";
                                }
                              }}
                            >
                              <div style={{
                                fontWeight: 600,
                                color: isToday ? "#fff" : darkMode ? "#f1f5f9" : "#0f172a",
                                marginBottom: dayEvents.length > 0 ? 4 : 0
                              }}>
                                {day.getDate()}
                              </div>
                              
                              {dayEvents.length > 0 && (
                                <div style={{
                                  display: "flex",
                                  gap: 2,
                                  justifyContent: "center",
                                  alignItems: "center"
                                }}>
                                  {dayEvents.slice(0, 3).map((ev, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        background: isToday ? "#fff" : EVENT_COLORS[ev.color || "blue"].dot
                                      }}
                                    />
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <div style={{
                                      fontSize: 7,
                                      fontWeight: 700,
                                      color: isToday ? "#fff" : "#3B82F6"
                                    }}>
                                      +{dayEvents.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ 
            background: darkMode ? "rgba(30, 41, 59, 0.4)" : "#fff",
            borderRadius: 16,
            padding: "20px",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
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
                  fontSize: 12,
                  color: darkMode ? "#64748b" : "#94a3b8",
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
                    className={isCurrentDay ? "current-day-pulse" : ""}
                    onClick={() => day && goToDate(day)}
                    style={{
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      background: day ? (isCurrentDay ? "linear-gradient(135deg, #3B82F6, #06B6D4)" : "transparent") : "transparent",
                      color: day ? (isCurrentDay ? "#fff" : (darkMode ? "#f1f5f9" : "#0f172a")) : "transparent",
                      fontWeight: isCurrentDay ? 700 : 500,
                      fontSize: 14,
                      cursor: day ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      border: "none",
                      minHeight: 40
                    }}
                    onMouseEnter={e => {
                      if (day && !isCurrentDay) {
                        e.currentTarget.style.background = darkMode ? "rgba(59, 130, 246, 0.3)" : "#f1f5f9";
                        e.currentTarget.style.fontWeight = "600";
                      }
                    }}
                    onMouseLeave={e => {
                      if (day && !isCurrentDay) {
                        e.currentTarget.style.background = "transparent";
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
        )}
      </div>
        
      {/* FIXED SIDEBAR - OPTIMIZED */}
      {showSidebar && (
        <div style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 380,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "80px 20px 20px 20px",
          background: darkMode 
            ? "rgba(15, 23, 42, 0.98)" 
            : "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderLeft: darkMode 
            ? "1px solid rgba(148, 163, 184, 0.1)" 
            : "1px solid #e2e8f0",
          boxShadow: darkMode 
            ? "-4px 0 24px rgba(0, 0, 0, 0.3)" 
            : "-4px 0 24px rgba(0, 0, 0, 0.1)",
          overflowY: "auto",
          zIndex: 40
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowSidebar(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f1f5f9",
              border: "none",
              cursor: "pointer",
              padding: "8px 10px",
              borderRadius: 8,
              color: darkMode ? "#f1f5f9" : "#64748b",
              fontSize: 14,
              transition: "all 0.2s ease"
            }}
          >
            ✕
          </button>

          {/* Events Preview */}
          <div style={{
            background: darkMode ? "rgba(15, 23, 42, 0.95)" : "#fff",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)"
          }}>
            <div style={{
              padding: "20px",
              borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9",
              background: darkMode ? "rgba(30, 41, 59, 0.3)" : "#fafbfc"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.3px"
              }}>
                📅 Upcoming
              </h3>
            </div>
            
            <div style={{
              maxHeight: 300,
              overflowY: "auto",
              padding: "12px"
            }}>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                
                const upcomingEvents = filteredEvents
                  .filter(ev => ev.start >= today && ev.start < nextWeek)
                  .sort((a, b) => a.start - b.start)
                  .slice(0, 15);
                
                if (upcomingEvents.length === 0) {
                  return (
                    <div style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      color: darkMode ? "#64748b" : "#94a3b8",
                      fontSize: 13
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                      <div>No upcoming events</div>
                    </div>
                  );
                }
                
                return upcomingEvents.map((ev, idx) => {
                  const colorStyle = EVENT_COLORS[ev.color || "blue"];
                  const isToday = ev.start.toDateString() === today.toDateString();
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => goToDate(ev.start)}
                      style={{
                        padding: "10px 12px",
                        marginBottom: 8,
                        borderRadius: 10,
                        background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc",
                        border: `1px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}`,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        borderLeft: `3px solid ${colorStyle.dot}`
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = darkMode ? "rgba(59, 130, 246, 0.3)" : "#eef2ff";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: darkMode ? "#f1f5f9" : "#0f172a",
                        marginBottom: 4
                      }}>
                        {ev.title}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: darkMode ? "#64748b" : "#94a3b8"
                      }}>
                        {isToday ? "Today" : ev.start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {/* Notes Section */}
          <div style={{
            background: darkMode ? "rgba(15, 23, 42, 0.95)" : "#fff",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #e2e8f0",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)",
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              padding: "20px",
              borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9",
              background: darkMode ? "rgba(30, 41, 59, 0.3)" : "#fafbfc"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.3px"
              }}>
                📝 Notes
              </h3>
            </div>
            <textarea
              value={sidebarNotes}
              onChange={(e) => setSidebarNotes(e.target.value)}
              placeholder="✍️ Quick notes..."
              style={{
                flex: 1,
                padding: "20px",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 14,
                lineHeight: 1.7,
                background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                color: darkMode ? "#e2e8f0" : "#0f172a",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                minHeight: 200
              }}
            />
          </div>
        </div>
      )}
      
      {/* Toggle Sidebar Button */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
            border: "none",
            borderRadius: "12px 0 0 12px",
            padding: "20px 12px",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
            transition: "all 0.3s ease",
            zIndex: 40,
            color: "#fff",
            fontSize: 20
          }}
        >
          ☰
        </button>
      )}

      {/* MODALS */}
      {showDeletedOverlay && (
        <Overlay title="Recently Deleted" onClose={() => setShowDeletedOverlay(false)} darkMode={darkMode}>
          {deletedEvents.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: darkMode ? "#64748b" : "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <div>No deleted events</div>
            </div>
          ) : (
            deletedEvents.map(ev => (
              <div key={ev.id} style={{
                padding: "16px 0",
                borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9"
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                  {ev.title}
                </div>
                {ev.deletedAt && (
                  <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#94a3b8", marginTop: 4 }}>
                    Deleted {ev.deletedAt.toDate().toLocaleString()}
                  </div>
                )}
                <button
                  onClick={() => restoreEvent(ev)}
                  style={{
                    background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                    marginTop: 8
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
        <Overlay title="Settings" onClose={() => setShowSettings(false)} darkMode={darkMode}>
          <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 24 }}>
            
            <div>
              <div style={{ 
                fontWeight: 700, 
                fontSize: 14, 
                color: darkMode ? "#f1f5f9" : "#0f172a", 
                marginBottom: 12
              }}>
                Theme
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDarkMode(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: darkMode ? "2px solid #334155" : "2px solid #3B82F6",
                    background: darkMode ? (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff") : "#eef2ff",
                    color: darkMode ? "#94a3b8" : "#1e3a8a",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  ☀️ Light
                </button>
                
                <button
                  onClick={() => setDarkMode(true)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: darkMode ? "2px solid #3B82F6" : "2px solid #334155",
                    background: darkMode ? "#1e3a8a" : "#1a1a1a",
                    color: darkMode ? "#fff" : "#94a3b8",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px",
              borderRadius: 10,
              background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f8fafc"
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                  Blur Past Dates
                </div>
                <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#94a3b8" }}>
                  Fade old dates
                </div>
              </div>
              <button
                onClick={() => setBlurPastDates(!blurPastDates)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  border: "none",
                  background: blurPastDates ? "#3B82F6" : "#cbd5e1",
                  cursor: "pointer",
                  position: "relative"
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 4,
                  left: blurPastDates ? 24 : 4,
                  transition: "all 0.2s ease"
                }} />
              </button>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 12 }}>
                Week Starts On
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setWeekStartsOnMonday(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: weekStartsOnMonday ? `2px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}` : "2px solid #3B82F6",
                    background: weekStartsOnMonday ? (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff") : "#eef2ff",
                    color: weekStartsOnMonday ? (darkMode ? "#94a3b8" : "#64748b") : "#1e3a8a",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Sunday
                </button>
                
                <button
                  onClick={() => setWeekStartsOnMonday(true)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: weekStartsOnMonday ? "2px solid #3B82F6" : `2px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}`,
                    background: weekStartsOnMonday ? "#eef2ff" : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
                    color: weekStartsOnMonday ? "#1e3a8a" : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Monday
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 12 }}>
                Time Format
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setUse24HourFormat(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: use24HourFormat ? `2px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}` : "2px solid #3B82F6",
                    background: use24HourFormat ? (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff") : "#eef2ff",
                    color: use24HourFormat ? (darkMode ? "#94a3b8" : "#64748b") : "#1e3a8a",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  12-hour
                </button>
                
                <button
                  onClick={() => setUse24HourFormat(true)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: use24HourFormat ? "2px solid #3B82F6" : `2px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}`,
                    background: use24HourFormat ? "#eef2ff" : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
                    color: use24HourFormat ? "#1e3a8a" : (darkMode ? "#94a3b8" : "#64748b"),
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  24-hour
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
      
      {showAddCategoryModal && (
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
        }} onClick={() => setShowAddCategoryModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: darkMode ? "rgba(30, 41, 59, 0.95)" : "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 400,
            boxShadow: darkMode ? "0 25px 50px rgba(0,0,0,0.8)" : "0 25px 50px rgba(0,0,0,0.3)",
            overflow: "hidden"
          }}>
            <div style={{ padding: "24px", borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                Add Category
              </h3>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
                  Name
                </label>
                <input
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #e2e8f0",
                    fontSize: 15,
                    fontFamily: "inherit",
                    outline: "none",
                    background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                    color: darkMode ? "#f1f5f9" : "#0f172a",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
                  Color
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(EVENT_COLORS).map(([colorName, colorStyle]) => (
                    <button
                      key={colorName}
                      onClick={() => setNewCategoryColor(colorName)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        border: newCategoryColor === colorName ? "3px solid #3B82F6" : "2px solid transparent",
                        background: colorStyle.bg,
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  onClick={addCategory}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 20px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Add
                </button>
                
                <button
                  onClick={() => setShowAddCategoryModal(false)}
                  style={{
                    flex: 1,
                    background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                    border: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 20px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: darkMode ? "#f1f5f9" : "#64748b",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            background: darkMode ? "rgba(30, 41, 59, 0.95)" : "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 480,
            boxShadow: darkMode ? "0 25px 50px rgba(0,0,0,0.8)" : "0 25px 50px rgba(0,0,0,0.3)",
            overflow: "hidden",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div style={{ padding: "24px", borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                {editingEvent ? "Edit Event" : "New Event"}
              </h3>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
                  Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Event title"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #e2e8f0",
                    fontSize: 16,
                    fontFamily: "inherit",
                    outline: "none",
                    background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                    color: darkMode ? "#f1f5f9" : "#0f172a",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
                  Category
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setEventCategory(cat.name)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: eventCategory === cat.name ? "2px solid #3B82F6" : `2px solid ${darkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0"}`,
                        background: eventCategory === cat.name ? (darkMode ? "#1e3a8a" : "#eef2ff") : (darkMode ? "rgba(30, 41, 59, 0.6)" : "#fff"),
                        color: eventCategory === cat.name ? (darkMode ? "#fff" : "#4338ca") : (darkMode ? "#94a3b8" : "#64748b"),
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: (EVENT_COLORS[cat.color] || EVENT_COLORS.blue).dot
                      }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
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
                      border: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #e2e8f0",
                      fontSize: 15,
                      fontFamily: "inherit",
                      background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                      color: darkMode ? "#f1f5f9" : "#0f172a",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
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
                      border: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #e2e8f0",
                      fontSize: 15,
                      fontFamily: "inherit",
                      background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#fff",
                      color: darkMode ? "#f1f5f9" : "#0f172a",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={saveEvent}
                  disabled={loading}
                  style={{
                    background: loading ? "#94a3b8" : "linear-gradient(135deg, #3B82F6, #06B6D4)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 32px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 16,
                    flex: 1,
                    minWidth: 120
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
                    border: darkMode ? "2px solid rgba(148, 163, 184, 0.2)" : "2px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "14px 32px",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    color: darkMode ? "#f1f5f9" : "#64748b",
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
                        background: darkMode ? "rgba(6, 182, 212, 0.2)" : "#f0f9ff",
                        border: darkMode ? "2px solid rgba(6, 182, 212, 0.4)" : "2px solid #bae6fd",
                        borderRadius: 12,
                        padding: "14px 32px",
                        cursor: "pointer",
                        color: darkMode ? "#06B6D4" : "#0369a1",
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
                        background: "#fef2f2",
                        border: "2px solid #fecaca",
                        borderRadius: 12,
                        padding: "14px 32px",
                        cursor: "pointer",
                        color: "#dc2626",
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
      
      {hoveredDateEvents && (
        <EventTooltip 
          events={hoveredDateEvents} 
          position={tooltipPosition} 
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function EventTooltip({ events, position, darkMode }) {
  if (!events || events.length === 0) return null;
  
  return (
    <div style={{
      position: "fixed",
      left: position.x + 10,
      top: position.y + 10,
      background: darkMode ? "rgba(30, 41, 59, 0.98)" : "#fff",
      border: darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "12px 16px",
      boxShadow: darkMode ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.15)",
      zIndex: 1000,
      maxWidth: 280,
      pointerEvents: "none"
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: darkMode ? "#94a3b8" : "#64748b",
        marginBottom: 8
      }}>
        {events.length} {events.length === 1 ? "Event" : "Events"}
      </div>
      {events.map((event, idx) => (
        <div key={idx} style={{
          padding: "6px 0",
          borderBottom: idx < events.length - 1 ? (darkMode ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid #f1f5f9") : "none"
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: darkMode ? "#f1f5f9" : "#0f172a",
            marginBottom: 4
          }}>
            {event.title}
          </div>
          <div style={{
            fontSize: 11,
            color: darkMode ? "#64748b" : "#94a3b8"
          }}>
            {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Overlay({ title, onClose, children, darkMode }) {
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
        background: darkMode ? "rgba(30, 41, 59, 0.95)" : "#fff",
        width: "100%",
        maxWidth: 440,
        maxHeight: "85vh",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: darkMode ? "0 25px 50px rgba(0,0,0,0.8)" : "0 25px 50px rgba(0,0,0,0.3)",
        border: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "none"
      }}>
        <div style={{
          padding: "20px 24px",
          borderBottom: darkMode ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: darkMode ? "rgba(51, 65, 85, 0.6)" : "#f8fafc",
              fontSize: 18,
              cursor: "pointer",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: darkMode ? "#94a3b8" : "#64748b"
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