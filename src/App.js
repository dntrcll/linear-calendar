import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "./App.css";

// Mock Firebase services using localStorage
const mockAuth = {
  currentUser: { uid: "demo-user", email: "demo@example.com", displayName: "Demo User" },
  onAuthStateChanged: (callback) => {
    // Immediately call with demo user
    callback({ uid: "demo-user", email: "demo@example.com", displayName: "Demo User" });
    return () => {}; // cleanup function
  },
  signInWithPopup: () => {
    return Promise.resolve({
      user: { uid: "demo-user", email: "demo@example.com", displayName: "Demo User" }
    });
  },
  signOut: () => {
    return Promise.resolve();
  }
};

const mockDb = {
  collection: (collectionName) => {
    return {
      doc: (docId) => {
        const storageKey = `firestore_${collectionName}_${docId}`;
        
        return {
          get: () => {
            const data = JSON.parse(localStorage.getItem(storageKey) || "null");
            return Promise.resolve({
              exists: () => !!data,
              data: () => data
            });
          },
          set: (data) => {
            localStorage.setItem(storageKey, JSON.stringify(data));
            return Promise.resolve();
          },
          update: (data) => {
            const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
            localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...data }));
            return Promise.resolve();
          },
          delete: () => {
            localStorage.removeItem(storageKey);
            return Promise.resolve();
          },
          onSnapshot: (callback) => {
            // Load initial data
            const data = JSON.parse(localStorage.getItem(storageKey) || "null");
            callback({
              exists: () => !!data,
              data: () => data
            });
            
            // Listen for storage changes (simulate real-time)
            const handleStorageChange = (e) => {
              if (e.key === storageKey) {
                const newData = JSON.parse(e.newValue || "null");
                callback({
                  exists: () => !!newData,
                  data: () => newData
                });
              }
            };
            
            window.addEventListener("storage", handleStorageChange);
            
            return () => {
              window.removeEventListener("storage", handleStorageChange);
            };
          }
        };
      },
      where: () => {
        return {
          get: () => Promise.resolve({ docs: [] }),
          onSnapshot: (callback) => {
            callback({ docs: [] });
            return () => {};
          }
        };
      }
    };
  }
};

const mockProvider = {};

// Use these instead of Firebase imports
const auth = mockAuth;
const db = mockDb;
const provider = mockProvider;

function AuthScreen({ onLogin, theme }) {
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await auth.signInWithPopup(provider);
      onLogin(result.user);
    } catch (error) {
      console.error("Login error:", error);
      // Auto-login with demo user
      onLogin(auth.currentUser);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: theme === "dark" 
        ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" 
        : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      padding: 20
    }}>
      <div style={{
        background: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: 24,
        padding: "48px 40px",
        boxShadow: theme === "dark" 
          ? "0 20px 60px rgba(0, 0, 0, 0.3)" 
          : "0 20px 60px rgba(0, 0, 0, 0.1)",
        border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
        maxWidth: 440,
        width: "100%",
        textAlign: "center"
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: theme === "dark" 
            ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
            : "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 28px",
          fontSize: 32,
          color: "white",
          fontWeight: "bold"
        }}>
          ⌛
        </div>
        
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 12,
          background: theme === "dark" 
            ? "linear-gradient(135deg, #60a5fa 0%, #c4b5fd 100%)" 
            : "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          Linear Calendar
        </h1>
        
        <p style={{
          color: theme === "dark" ? "#94a3b8" : "#64748b",
          fontSize: 16,
          lineHeight: 1.6,
          marginBottom: 40
        }}>
          AI-powered life optimization system. Visualize your time, track habits, and achieve your goals with intelligent scheduling.
        </p>
        
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 24px",
            background: theme === "dark" 
              ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
              : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            color: "white",
            border: "none",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = theme === "dark" 
              ? "0 10px 30px rgba(59, 130, 246, 0.3)" 
              : "0 10px 30px rgba(37, 99, 235, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          {loading ? (
            <>
              <div className="thinking-dots">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white", animationDelay: "0s" }}></div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white", animationDelay: "0.2s" }}></div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white", animationDelay: "0.4s" }}></div>
              </div>
              Connecting...
            </>
          ) : (
            "Enter Life OS →"
          )}
        </button>
        
        <div style={{
          fontSize: 11,
          color: theme === "dark" ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.6)",
          marginTop: 24,
          letterSpacing: 1,
          textTransform: "uppercase"
        }}>
          v5.0 • AI-Powered • Life Optimization
        </div>
      </div>
    </div>
  );
}

function Calendar() {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", description: "" });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tags, setTags] = useState(["Work", "Personal", "Study"]);
  const [newTag, setNewTag] = useState("");
  const [theme, setTheme] = useState("light");
  
  const user = auth.currentUser;
  
  useEffect(() => {
    // Load events from localStorage
    const loadEvents = () => {
      const savedEvents = JSON.parse(localStorage.getItem("calendar-events") || "[]");
      setEvents(savedEvents);
    };
    
    loadEvents();
    
    // Listen for auth changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadEvents();
      }
    });
    
    return unsubscribe;
  }, []);
  
  useEffect(() => {
    // Save events to localStorage
    localStorage.setItem("calendar-events", JSON.stringify(events));
  }, [events]);
  
  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    
    const event = {
      id: Date.now().toString(),
      ...newEvent,
      userId: user?.uid,
      tags: [],
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    setEvents([...events, event]);
    setNewEvent({ title: "", date: "", description: "" });
  };
  
  const handleDeleteEvent = (id) => {
    setEvents(events.filter(event => event.id !== id));
    if (selectedEvent?.id === id) {
      setSelectedEvent(null);
    }
  };
  
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };
  
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };
  
  // Calendar grid generation
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDay; i++) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - startingDay + i + 1),
        isCurrentMonth: false,
        events: []
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === dayDate.toDateString();
      });
      
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        events: dayEvents
      });
    }
    
    // Next month days to fill grid
    const totalCells = 42; // 6 weeks * 7 days
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        events: []
      });
    }
    
    return days;
  };
  
  const calendarDays = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-GB", { 
    month: "long", 
    year: "numeric" 
  });
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });
  
  return (
    <div style={{
      minHeight: "100vh",
      background: theme === "dark" ? "#0f172a" : "#f8fafc",
      color: theme === "dark" ? "#e2e8f0" : "#1e293b",
      transition: "all 0.3s"
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px",
        borderBottom: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: theme === "dark" 
              ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
              : "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "white",
            fontWeight: "bold"
          }}>
            ⌛
          </div>
          <h1 style={{ 
            fontSize: 20, 
            fontWeight: 700,
            background: theme === "dark" 
              ? "linear-gradient(135deg, #60a5fa 0%, #c4b5fd 100%)" 
              : "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Linear Calendar
          </h1>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: "8px 16px",
              background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
              border: "none",
              borderRadius: 12,
              color: theme === "dark" ? "#e2e8f0" : "#1e293b",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
            {theme === "light" ? "Dark" : "Light"}
          </button>
          
          <div style={{
            padding: "8px 16px",
            background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
            borderRadius: 12,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981"
            }}></div>
            {user?.displayName || "Demo User"}
          </div>
          
          <button
            onClick={() => auth.signOut()}
            style={{
              padding: "8px 16px",
              background: theme === "dark" ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
              color: theme === "dark" ? "#fca5a5" : "#dc2626",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Logout
          </button>
        </div>
      </div>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "280px 1fr 320px",
        gap: 24,
        padding: 24,
        maxWidth: 1600,
        margin: "0 auto"
      }}>
        {/* Left Sidebar */}
        <div>
          <div style={{
            background: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
            borderRadius: 20,
            padding: 24,
            border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <h3 style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              marginBottom: 20,
              color: theme === "dark" ? "#94a3b8" : "#64748b",
              textTransform: "uppercase",
              letterSpacing: 1
            }}>
              Contexts
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Personal", "Work", "Study", "Deleted"].map((context) => (
                <div
                  key={context}
                  style={{
                    padding: "12px 16px",
                    background: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                    border: context === "Work" 
                      ? `1px solid ${theme === "dark" ? "#3b82f6" : "#2563eb"}` 
                      : "1px solid transparent"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = theme === "dark" 
                      ? "rgba(255, 255, 255, 0.1)" 
                      : "rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = theme === "dark" 
                      ? "rgba(255, 255, 255, 0.05)" 
                      : "rgba(0, 0, 0, 0.03)";
                  }}
                >
                  {context}
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setView("day")}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: theme === "dark" 
                    ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
                    : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12
                }}
              >
                Day View
              </button>
              
              <button
                onClick={() => {
                  setSelectedEvent({
                    id: "new",
                    title: "",
                    date: new Date().toISOString().split('T')[0],
                    description: "",
                    tags: []
                  });
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Calendar */}
        <div>
          <div style={{
            background: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
            borderRadius: 20,
            padding: 24,
            border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                  onClick={prevMonth}
                  style={{
                    padding: "8px 16px",
                    background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                    border: "none",
                    borderRadius: 12,
                    color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  ←
                </button>
                
                <h2 style={{ fontSize: 24, fontWeight: 700 }}>
                  {monthYear}
                </h2>
                
                <button
                  onClick={nextMonth}
                  style={{
                    padding: "8px 16px",
                    background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                    border: "none",
                    borderRadius: 12,
                    color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  →
                </button>
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                {["month", "week", "day"].map((viewType) => (
                  <button
                    key={viewType}
                    onClick={() => setView(viewType)}
                    style={{
                      padding: "8px 16px",
                      background: view === viewType
                        ? (theme === "dark" 
                            ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
                            : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)")
                        : (theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"),
                      color: view === viewType ? "white" : (theme === "dark" ? "#e2e8f0" : "#1e293b"),
                      border: "none",
                      borderRadius: 12,
                      cursor: "pointer",
                      fontSize: 14,
                      textTransform: "capitalize"
                    }}
                  >
                    {viewType}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Day headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 8,
              marginBottom: 16
            }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme === "dark" ? "#94a3b8" : "#64748b",
                    padding: "12px 0"
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 8
            }}>
              {calendarDays.map((day, index) => {
                const isToday = new Date().toDateString() === day.date.toDateString();
                
                return (
                  <div
                    key={index}
                    style={{
                      minHeight: 120,
                      background: theme === "dark" 
                        ? day.isCurrentMonth 
                          ? isToday
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(255, 255, 255, 0.05)"
                          : "rgba(255, 255, 255, 0.02)"
                        : day.isCurrentMonth
                          ? isToday
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(255, 255, 255, 0.9)"
                          : "rgba(0, 0, 0, 0.02)",
                      borderRadius: 12,
                      padding: 12,
                      border: theme === "dark"
                        ? `1px solid ${day.isCurrentMonth ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)"}`
                        : `1px solid ${day.isCurrentMonth ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.05)"}`,
                      opacity: day.isCurrentMonth ? 1 : 0.5,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => {
                      setSelectedEvent({
                        id: "new",
                        title: "",
                        date: day.date.toISOString().split('T')[0],
                        description: "",
                        tags: []
                      });
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.borderColor = theme === "dark" ? "#3b82f6" : "#2563eb";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.borderColor = theme === "dark"
                        ? (day.isCurrentMonth ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)")
                        : (day.isCurrentMonth ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.05)");
                    }}
                  >
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: isToday 
                        ? (theme === "dark" ? "#60a5fa" : "#2563eb")
                        : (theme === "dark" ? "#e2e8f0" : "#1e293b")
                    }}>
                      {day.date.getDate()}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {day.events.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          style={{
                            background: theme === "dark" 
                              ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
                              : "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: "pointer",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      
                      {day.events.length > 3 && (
                        <div style={{
                          color: theme === "dark" ? "#94a3b8" : "#64748b",
                          fontSize: 12,
                          padding: "4px 8px"
                        }}>
                          +{day.events.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div>
          <div style={{
            background: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
            borderRadius: 20,
            padding: 24,
            border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)",
            marginBottom: 24
          }}>
            <h3 style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              marginBottom: 20,
              color: theme === "dark" ? "#94a3b8" : "#64748b",
              textTransform: "uppercase",
              letterSpacing: 1
            }}>
              Add Event
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                placeholder="Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 14
                }}
              />
              
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 14
                }}
              />
              
              <textarea
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 14,
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
              
              <button
                onClick={handleAddEvent}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" 
                    ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
                    : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                Add Event
              </button>
            </div>
          </div>
          
          <div style={{
            background: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
            borderRadius: 20,
            padding: 24,
            border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)",
            marginBottom: 24
          }}>
            <h3 style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              marginBottom: 20,
              color: theme === "dark" ? "#94a3b8" : "#64748b",
              textTransform: "uppercase",
              letterSpacing: 1
            }}>
              Upcoming
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {todayEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: "12px 16px",
                    background: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    borderRadius: 12,
                    borderLeft: `4px solid ${theme === "dark" ? "#3b82f6" : "#2563eb"}`,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onClick={() => setSelectedEvent(event)}
                  onMouseEnter={(e) => {
                    e.target.style.background = theme === "dark" 
                      ? "rgba(255, 255, 255, 0.1)" 
                      : "rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = theme === "dark" 
                      ? "rgba(255, 255, 255, 0.05)" 
                      : "rgba(0, 0, 0, 0.03)";
                  }}
                >
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                    marginBottom: 4
                  }}>
                    {event.title}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: theme === "dark" ? "#94a3b8" : "#64748b" 
                  }}>
                    {formatDate(event.date)}
                  </div>
                </div>
              ))}
              
              {todayEvents.length === 0 && (
                <div style={{ 
                  textAlign: "center", 
                  padding: 20,
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                  fontSize: 14
                }}>
                  No events today
                </div>
              )}
            </div>
          </div>
          
          <div style={{
            background: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.9)",
            borderRadius: 20,
            padding: 24,
            border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              marginBottom: 16,
              color: theme === "dark" ? "#94a3b8" : "#64748b",
              textTransform: "uppercase",
              letterSpacing: 1
            }}>
              Tags
            </div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "6px 12px",
                    background: theme === "dark" 
                      ? "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)" 
                      : "linear-gradient(135deg, #34d399 0%, #60a5fa 100%)",
                    color: "white",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="New tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 14
                }}
              />
              
              <button
                onClick={handleAddTag}
                style={{
                  padding: "8px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Event Detail Modal */}
      {selectedEvent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}
        onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              background: theme === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)",
              borderRadius: 20,
              padding: 32,
              maxWidth: 500,
              width: "100%",
              border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(20px)",
              boxShadow: theme === "dark" 
                ? "0 40px 80px rgba(0, 0, 0, 0.4)" 
                : "0 40px 80px rgba(0, 0, 0, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700 }}>
                {selectedEvent.id === "new" ? "New Event" : "Edit Event"}
              </h2>
              
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: "8px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  cursor: "pointer",
                  fontSize: 20,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                placeholder="Event Title"
                value={selectedEvent.title}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 16,
                  fontWeight: 600
                }}
              />
              
              <input
                type="date"
                value={selectedEvent.date}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, date: e.target.value })}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 14
                }}
              />
              
              <textarea
                placeholder="Description"
                value={selectedEvent.description}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                rows={4}
                style={{
                  padding: "12px 16px",
                  background: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: 12,
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 14,
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
              
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {selectedEvent.id !== "new" && (
                  <button
                    onClick={() => {
                      handleDeleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: theme === "dark" ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                      color: theme === "dark" ? "#fca5a5" : "#dc2626",
                      border: "none",
                      borderRadius: 12,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    Delete
                  </button>
                )}
                
                <button
                  onClick={() => {
                    if (selectedEvent.id === "new") {
                      handleAddEvent();
                    } else {
                      // Update existing event
                      setEvents(events.map(e => 
                        e.id === selectedEvent.id ? selectedEvent : e
                      ));
                    }
                    setSelectedEvent(null);
                  }}
                  style={{
                    flex: 2,
                    padding: "12px 16px",
                    background: theme === "dark" 
                      ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
                      : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  {selectedEvent.id === "new" ? "Create Event" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  const handleLogin = (userData) => {
    setUser(userData);
  };
  
  const handleLogout = () => {
    auth.signOut();
    setUser(null);
  };
  
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme === "dark" ? "#0f172a" : "#f8fafc"
      }}>
        <div className="thinking-dots">
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", animationDelay: "0s" }}></div>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", animationDelay: "0.2s" }}></div>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <AuthScreen onLogin={handleLogin} theme={theme} />;
  }
  
  return <Calendar />;
}

export default App;