import React, { useState, useEffect } from 'react';
import {
  loadMonthTelemetry,
  toggleHabitCompletion,
  updateDayTelemetry,
  createHabit
} from '../services/telemetryService';
import ICONS from '../constants/icons';

const MOOD_EMOJIS = ['😊', '🙂', '😐', '😔', '😞'];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Telemetry Page - Single-page flashcard layout
 * Everything visible at once, no scrolling
 */
export const TelemetryPage = ({ theme, config, accentColor, user }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const [habits, setHabits] = useState([]);
  const [days, setDays] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('build');

  const [editingMood, setEditingMood] = useState(null);
  const [editingMemorable, setEditingMemorable] = useState(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  const [visibleHabits, setVisibleHabits] = useState({});

  // Load data
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
      setHabits(result.habits);
      setDays(result.days);
      setCompletions(result.completions);
      setLoading(false);

      // Initialize all habits as visible
      const visible = {};
      result.habits.forEach(h => visible[h.id] = true);
      setVisibleHabits(visible);
    };

    loadData();
  }, [user?.uid, currentYear, currentMonth]);

  const reloadData = async () => {
    const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
    setDays(result.days);
    setCompletions(result.completions);
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const getDayData = (dayNum) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return days.find(d => d.date === dateStr) || { date: dateStr, mood_emoji: '', memorable_moment: '', mood_score: null, note: '' };
  };

  const isCompleted = (dayNum, habitId) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const completion = completions.find(c => c.date === dateStr && c.habit_id === habitId);
    return completion?.completed || false;
  };

  const handleToggle = async (dayNum, habitId) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const currentStatus = isCompleted(dayNum, habitId);
    await toggleHabitCompletion(user.uid, dateStr, habitId, !currentStatus);
    reloadData();
  };

  const handleMoodSelect = async (dayNum, emoji) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = getDayData(dayNum);
    await updateDayTelemetry(user.uid, dateStr, dayData.mood_score, dayData.note, emoji, dayData.memorable_moment);
    setEditingMood(null);
    reloadData();
  };

  const handleMemorableSave = async (dayNum) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = getDayData(dayNum);
    await updateDayTelemetry(user.uid, dateStr, dayData.mood_score, dayData.note, dayData.mood_emoji, editingMemoText);
    setEditingMemorable(null);
    setEditingMemoText('');
    reloadData();
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    const maxOrder = Math.max(...habits.map(h => h.display_order), 0);
    await createHabit(user.uid, newHabitName.trim(), newHabitType, maxOrder + 1);
    const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
    setHabits(result.habits);
    setNewHabitName('');
    setShowAddHabit(false);
  };

  // Calculate stats
  const buildHabits = habits.filter(h => h.habit_type === 'build');
  const eliminateHabits = habits.filter(h => h.habit_type === 'eliminate');

  const buildTotal = daysInMonth * buildHabits.length;
  const buildCompleted = completions.filter(c =>
    c.completed && buildHabits.some(h => h.id === c.habit_id)
  ).length;
  const buildPct = buildTotal > 0 ? Math.round((buildCompleted / buildTotal) * 100) : 0;

  const eliminateTotal = daysInMonth * eliminateHabits.length;
  const eliminateCompleted = completions.filter(c =>
    c.completed && eliminateHabits.some(h => h.id === c.habit_id)
  ).length;
  const eliminatePct = eliminateTotal > 0 ? Math.round((eliminateCompleted / eliminateTotal) * 100) : 0;

  const daysLogged = days.filter(d => d.mood_emoji || d.memorable_moment).length;

  if (!user) {
    return (
      <div style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: theme.textSec,
        fontFamily: theme.fontFamily
      }}>
        <ICONS.Lock width={48} height={48} style={{ opacity: 0.5 }} />
        <p style={{ fontSize: 14, fontFamily: theme.fontFamily }}>Sign in to view your telemetry</p>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      overflow: 'hidden',
      padding: '16px',
      fontFamily: theme.fontFamily
    }}>
      <div style={{
        height: '100%',
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        {/* Header Row: Month Navigation + Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0
        }}>
          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: '8px 12px'
          }}>
            <button
              onClick={goToPreviousMonth}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                color: theme.text,
                cursor: 'pointer',
                display: 'flex',
                fontFamily: theme.fontFamily
              }}
            >
              <ICONS.ChevronLeft width={18} height={18} />
            </button>
            <span style={{
              fontSize: 15,
              fontWeight: 700,
              color: theme.text,
              minWidth: 160,
              textAlign: 'center',
              fontFamily: theme.fontFamily
            }}>
              {monthName}
            </span>
            <button
              onClick={goToNextMonth}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                color: theme.text,
                cursor: 'pointer',
                display: 'flex',
                fontFamily: theme.fontFamily
              }}
            >
              <ICONS.ChevronRight width={18} height={18} />
            </button>
          </div>

          {/* Compact Stats */}
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <div style={{
              flex: 1,
              padding: '8px 12px',
              background: config.darkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
              border: '1px solid #10b981',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                BUILD
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#10b981',
                fontFamily: theme.fontFamily
              }}>
                {buildPct}%
              </span>
            </div>

            <div style={{
              flex: 1,
              padding: '8px 12px',
              background: config.darkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#ef4444',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                ELIMINATE
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#ef4444',
                fontFamily: theme.fontFamily
              }}>
                {eliminatePct}%
              </span>
            </div>

            <div style={{
              flex: 1,
              padding: '8px 12px',
              background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.textMuted,
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                LOGGED
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {daysLogged}/{daysInMonth}
              </span>
            </div>
          </div>

          {/* Add Habit Button */}
          <button
            onClick={() => setShowAddHabit(!showAddHabit)}
            style={{
              padding: '8px 14px',
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}`,
              borderRadius: 8,
              color: accentColor,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: theme.fontFamily,
              flexShrink: 0
            }}
          >
            <ICONS.Plus width={14} height={14} />
            Add Habit
          </button>
        </div>

        {/* Add Habit Form */}
        {showAddHabit && (
          <div style={{
            padding: 12,
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexShrink: 0
          }}>
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
              placeholder="Habit name..."
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                color: theme.text,
                fontSize: 13,
                fontFamily: theme.fontFamily
              }}
            />
            <select
              value={newHabitType}
              onChange={(e) => setNewHabitType(e.target.value)}
              style={{
                padding: '8px 12px',
                background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                color: theme.text,
                fontSize: 13,
                fontFamily: theme.fontFamily,
                cursor: 'pointer'
              }}
            >
              <option value="build">Build</option>
              <option value="eliminate">Eliminate</option>
            </select>
            <button
              onClick={handleAddHabit}
              style={{
                padding: '8px 16px',
                background: accentColor,
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: theme.fontFamily
              }}
            >
              Add
            </button>
            <button
              onClick={() => setShowAddHabit(false)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                color: theme.textMuted,
                cursor: 'pointer',
                fontFamily: theme.fontFamily
              }}
            >
              <ICONS.Close width={16} height={16} />
            </button>
          </div>
        )}

        {/* Main Content: Grid + Chart Side-by-Side */}
        {loading ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
            fontSize: 13,
            fontFamily: theme.fontFamily
          }}>
            Loading...
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: 12,
            overflow: 'hidden'
          }}>
            {/* Habit Grid */}
            <div style={{
              background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              overflow: 'auto',
              padding: 12
            }}>
              {habits.length === 0 ? (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.textMuted,
                  fontSize: 13,
                  fontFamily: theme.fontFamily
                }}>
                  Add your first habit to start tracking
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  fontFamily: theme.fontFamily
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                        padding: '8px 10px',
                        borderBottom: `2px solid ${theme.border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: theme.text,
                        textAlign: 'left',
                        zIndex: 2,
                        fontFamily: theme.fontFamily
                      }}>
                        Day
                      </th>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                        padding: '8px 10px',
                        borderBottom: `2px solid ${theme.border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: theme.text,
                        textAlign: 'center',
                        zIndex: 2,
                        fontFamily: theme.fontFamily
                      }}>
                        Mood
                      </th>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                        padding: '8px 10px',
                        borderBottom: `2px solid ${theme.border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: theme.text,
                        textAlign: 'left',
                        minWidth: 180,
                        zIndex: 2,
                        fontFamily: theme.fontFamily
                      }}>
                        Memorable Moment
                      </th>
                      {habits.map(habit => (
                        <th key={habit.id} style={{
                          position: 'sticky',
                          top: 0,
                          background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                          padding: '8px 6px',
                          borderBottom: `2px solid ${theme.border}`,
                          fontSize: 11,
                          fontWeight: 700,
                          color: habit.habit_type === 'build' ? '#10b981' : '#ef4444',
                          textAlign: 'center',
                          minWidth: 70,
                          maxWidth: 90,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          zIndex: 2,
                          fontFamily: theme.fontFamily
                        }}>
                          {habit.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dayNum => {
                      const dayData = getDayData(dayNum);
                      const date = new Date(currentYear, currentMonth - 1, dayNum);
                      const weekday = WEEKDAY_NAMES[date.getDay()];

                      return (
                        <tr key={dayNum}>
                          <td style={{
                            padding: '6px 10px',
                            borderBottom: `1px solid ${theme.border}20`,
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.textSec,
                            fontFamily: theme.fontFamily
                          }}>
                            {dayNum} <span style={{ color: theme.textMuted, fontSize: 10, fontWeight: 500 }}>{weekday}</span>
                          </td>
                          <td style={{
                            padding: '6px 10px',
                            borderBottom: `1px solid ${theme.border}20`,
                            textAlign: 'center',
                            position: 'relative'
                          }}>
                            {editingMood === dayNum ? (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                gap: 4,
                                background: config.darkMode ? '#1E293B' : '#fff',
                                border: `1px solid ${theme.border}`,
                                borderRadius: 8,
                                padding: 6,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                zIndex: 100
                              }}>
                                {MOOD_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleMoodSelect(dayNum, emoji)}
                                    style={{
                                      padding: 4,
                                      background: 'transparent',
                                      border: 'none',
                                      fontSize: 18,
                                      cursor: 'pointer',
                                      fontFamily: theme.fontFamily
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            <span
                              onClick={() => setEditingMood(editingMood === dayNum ? null : dayNum)}
                              style={{
                                fontSize: 18,
                                cursor: 'pointer',
                                opacity: dayData.mood_emoji ? 1 : 0.3,
                                fontFamily: theme.fontFamily
                              }}
                            >
                              {dayData.mood_emoji || '😐'}
                            </span>
                          </td>
                          <td style={{
                            padding: '6px 10px',
                            borderBottom: `1px solid ${theme.border}20`
                          }}>
                            {editingMemorable === dayNum ? (
                              <input
                                type="text"
                                value={editingMemoText}
                                onChange={(e) => setEditingMemoText(e.target.value)}
                                onBlur={() => handleMemorableSave(dayNum)}
                                onKeyPress={(e) => e.key === 'Enter' && handleMemorableSave(dayNum)}
                                autoFocus
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                  border: `1px solid ${accentColor}`,
                                  borderRadius: 4,
                                  color: theme.text,
                                  fontSize: 11,
                                  fontFamily: theme.fontFamily
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingMemorable(dayNum);
                                  setEditingMemoText(dayData.memorable_moment);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  color: dayData.memorable_moment ? theme.text : theme.textMuted,
                                  fontSize: 11,
                                  fontStyle: dayData.memorable_moment ? 'normal' : 'italic',
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  fontFamily: theme.fontFamily
                                }}
                              >
                                {dayData.memorable_moment || 'Click to add...'}
                              </span>
                            )}
                          </td>
                          {habits.map(habit => (
                            <td
                              key={habit.id}
                              onClick={() => handleToggle(dayNum, habit.id)}
                              style={{
                                padding: '6px',
                                borderBottom: `1px solid ${theme.border}20`,
                                textAlign: 'center',
                                cursor: 'pointer',
                                fontSize: 16,
                                fontWeight: 700,
                                color: isCompleted(dayNum, habit.id)
                                  ? (habit.habit_type === 'build' ? '#10b981' : '#ef4444')
                                  : theme.border,
                                userSelect: 'none',
                                fontFamily: theme.fontFamily
                              }}
                            >
                              {isCompleted(dayNum, habit.id) ? '×' : '·'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Habit Trends Chart */}
            <div style={{
              background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <h3 style={{
                fontSize: 13,
                fontWeight: 700,
                color: theme.text,
                margin: 0,
                marginBottom: 12,
                fontFamily: theme.fontFamily
              }}>
                Habit Trends
              </h3>

              {/* Toggle buttons */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 12,
                maxHeight: 80,
                overflow: 'auto'
              }}>
                {habits.map((habit, index) => {
                  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];
                  const color = colors[index % colors.length];
                  const visible = visibleHabits[habit.id];

                  return (
                    <button
                      key={habit.id}
                      onClick={() => setVisibleHabits({ ...visibleHabits, [habit.id]: !visible })}
                      style={{
                        padding: '4px 8px',
                        background: visible ? `${color}15` : 'transparent',
                        border: `1px solid ${visible ? color : theme.border}`,
                        borderRadius: 6,
                        color: visible ? color : theme.textMuted,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: theme.fontFamily
                      }}
                    >
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: color,
                        opacity: visible ? 1 : 0.3
                      }} />
                      {habit.name}
                    </button>
                  );
                })}
              </div>

              {/* Chart */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <HabitTrendChart
                  theme={theme}
                  config={config}
                  habits={habits}
                  completions={completions}
                  year={currentYear}
                  month={currentMonth}
                  visibleHabits={visibleHabits}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Compact Habit Trend Chart
const HabitTrendChart = ({ theme, config, habits, completions, year, month, visibleHabits }) => {
  const daysInMonth = new Date(year, month, 0).getDate();

  const habitData = habits.map((habit, index) => {
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const completion = completions.find(c => c.date === dateStr && c.habit_id === habit.id);
      return {
        day: dayNum,
        completed: completion?.completed ? 1 : 0
      };
    });

    // Calculate rolling average (smoother line)
    const rollingData = data.map((d, i) => {
      const window = data.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((sum, w) => sum + w.completed, 0) / window.length;
      return {
        day: d.day,
        percentage: avg * 100
      };
    });

    return { habit, data: rollingData, index };
  });

  const width = 100;
  const height = 100;
  const padding = { top: 5, right: 5, bottom: 15, left: 25 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (day) => padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth;
  const yScale = (percentage) => padding.top + chartHeight - (percentage / 100) * chartHeight;

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {[0, 50, 100].map(pct => (
        <g key={pct}>
          <line
            x1={padding.left}
            y1={yScale(pct)}
            x2={width - padding.right}
            y2={yScale(pct)}
            stroke={theme.border}
            strokeWidth={0.3}
            opacity={0.3}
          />
          <text
            x={padding.left - 3}
            y={yScale(pct) + 2}
            textAnchor="end"
            fill={theme.textMuted}
            fontSize={5}
            fontFamily={theme.fontFamily}
          >
            {pct}
          </text>
        </g>
      ))}

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke={theme.border}
        strokeWidth={0.5}
      />

      {/* Habit lines */}
      {habitData.map(({ habit, data, index }) => {
        if (!visibleHabits[habit.id]) return null;

        const color = colors[index % colors.length];
        const pathD = data.map((point, i) =>
          `${i === 0 ? 'M' : 'L'} ${xScale(point.day)} ${yScale(point.percentage)}`
        ).join(' ');

        return (
          <path
            key={habit.id}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        );
      })}

      {/* Day labels */}
      {[1, Math.floor(daysInMonth / 2), daysInMonth].map(day => (
        <text
          key={day}
          x={xScale(day)}
          y={height - padding.bottom + 8}
          textAnchor="middle"
          fill={theme.textMuted}
          fontSize={5}
          fontFamily={theme.fontFamily}
        >
          {day}
        </text>
      ))}
    </svg>
  );
};
