import React, { useState, useEffect } from 'react';
import {
  loadMonthTelemetry,
  toggleHabitCompletion,
  updateDayTelemetry,
  createHabit
} from '../services/telemetryService';
import { supabase } from '../supabaseClient';
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
  const [metrics, setMetrics] = useState([]);
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

      // Load metrics for monthly summary
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;

      const { data: metricsData } = await supabase
        .from('life_metrics')
        .select('*')
        .eq('user_id', user.uid)
        .gte('date', startDate)
        .lte('date', endDate);

      setMetrics(metricsData || []);
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

  // Calculate monthly summary stats from metrics
  const sleepMetrics = metrics.filter(m => m.metric_name === 'sleep_hours');
  const avgSleep = sleepMetrics.length > 0
    ? (sleepMetrics.reduce((sum, m) => sum + m.metric_value, 0) / sleepMetrics.length).toFixed(1)
    : 0;

  const workoutCount = metrics.filter(m => m.metric_name === 'workout_type' && m.metric_value).length;
  const meditationCount = completions.filter(c => {
    const habit = habits.find(h => h.id === c.habit_id);
    return habit && habit.name.toLowerCase().includes('meditat') && c.completed;
  }).length;
  const readingCount = completions.filter(c => {
    const habit = habits.find(h => h.id === c.habit_id);
    return habit && habit.name.toLowerCase().includes('read') && c.completed;
  }).length;

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

        {/* Monthly Summary */}
        {!loading && (avgSleep > 0 || workoutCount > 0 || meditationCount > 0 || readingCount > 0) && (
          <div style={{
            display: 'flex',
            gap: 8,
            flexShrink: 0
          }}>
            {avgSleep > 0 && (
              <div style={{
                flex: 1,
                padding: '10px 12px',
                background: config.darkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
                border: '1px solid #6366f1',
                borderRadius: 8
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#6366f1',
                  marginBottom: 4,
                  letterSpacing: '0.05em',
                  fontFamily: theme.fontFamily
                }}>
                  AVG SLEEP
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.text,
                  fontFamily: theme.fontFamily
                }}>
                  {avgSleep}h
                </div>
              </div>
            )}
            {workoutCount > 0 && (
              <div style={{
                flex: 1,
                padding: '10px 12px',
                background: config.darkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                border: '1px solid #10b981',
                borderRadius: 8
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#10b981',
                  marginBottom: 4,
                  letterSpacing: '0.05em',
                  fontFamily: theme.fontFamily
                }}>
                  WORKOUTS
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.text,
                  fontFamily: theme.fontFamily
                }}>
                  {workoutCount}
                </div>
              </div>
            )}
            {meditationCount > 0 && (
              <div style={{
                flex: 1,
                padding: '10px 12px',
                background: config.darkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.05)',
                border: '1px solid #a855f7',
                borderRadius: 8
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#a855f7',
                  marginBottom: 4,
                  letterSpacing: '0.05em',
                  fontFamily: theme.fontFamily
                }}>
                  MEDITATION
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.text,
                  fontFamily: theme.fontFamily
                }}>
                  {meditationCount}
                </div>
              </div>
            )}
            {readingCount > 0 && (
              <div style={{
                flex: 1,
                padding: '10px 12px',
                background: config.darkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
                border: '1px solid #f59e0b',
                borderRadius: 8
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#f59e0b',
                  marginBottom: 4,
                  letterSpacing: '0.05em',
                  fontFamily: theme.fontFamily
                }}>
                  READING
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.text,
                  fontFamily: theme.fontFamily
                }}>
                  {readingCount}
                </div>
              </div>
            )}
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
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        backdropFilter: 'blur(8px)',
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
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        backdropFilter: 'blur(8px)',
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
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        backdropFilter: 'blur(8px)',
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
                          background: config.darkMode ? '#0f172a' : '#ffffff',
                          backdropFilter: 'blur(8px)',
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

            {/* Habit Trends Chart - Portrait */}
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

              {/* Legend */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginBottom: 12,
                maxHeight: 100,
                overflow: 'auto'
              }}>
                {habits.map((habit, index) => {
                  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];
                  const color = colors[index % colors.length];

                  return (
                    <div
                      key={habit.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        color: theme.text,
                        fontFamily: theme.fontFamily
                      }}
                    >
                      <div style={{
                        width: 12,
                        height: 2,
                        background: color,
                        borderRadius: 1
                      }} />
                      {habit.name}
                    </div>
                  );
                })}
              </div>

              {/* Chart */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <PortraitHabitChart
                  theme={theme}
                  config={config}
                  habits={habits}
                  completions={completions}
                  year={currentYear}
                  month={currentMonth}
                  daysInMonth={daysInMonth}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Portrait Habit Chart - Vertical orientation with days going down
const PortraitHabitChart = ({ theme, config, habits, completions, year, month, daysInMonth }) => {
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];

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

    return { habit, data, index, color: colors[index % colors.length] };
  });

  const width = 300;
  const height = 800;
  const padding = { top: 20, right: 30, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Portrait: days on Y-axis (0 at top, 30 at bottom), completion on X-axis (0-100%)
  const yScale = (day) => padding.top + ((day - 1) / (daysInMonth - 1)) * chartHeight;
  const xScale = (completed) => padding.left + completed * chartWidth;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Dark background */}
      <rect x="0" y="0" width={width} height={height} fill={config.darkMode ? '#1e293b' : '#f8fafc'} rx="8" />

      {/* Grid lines - horizontal for days */}
      {Array.from({ length: Math.floor(daysInMonth / 5) + 1 }, (_, i) => i * 5).map(day => {
        if (day === 0 || day > daysInMonth) return null;
        return (
          <line
            key={day}
            x1={padding.left}
            y1={yScale(day)}
            x2={width - padding.right}
            y2={yScale(day)}
            stroke={config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            strokeWidth={0.5}
          />
        );
      })}

      {/* Grid lines - vertical for completion */}
      {[0, 0.5, 1].map(pct => (
        <line
          key={pct}
          x1={xScale(pct)}
          y1={padding.top}
          x2={xScale(pct)}
          y2={height - padding.bottom}
          stroke={config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis labels (days) */}
      {[0, Math.floor(daysInMonth / 2), daysInMonth].map(day => {
        if (day === 0) return null;
        return (
          <text
            key={day}
            x={padding.left - 8}
            y={yScale(day) + 3}
            textAnchor="end"
            fill={theme.textMuted}
            fontSize={10}
            fontFamily={theme.fontFamily}
          >
            {day}
          </text>
        );
      })}

      {/* X-axis labels (completion %) */}
      {[0, 50, 100].map(pct => (
        <text
          key={pct}
          x={xScale(pct / 100)}
          y={height - padding.bottom + 15}
          textAnchor="middle"
          fill={theme.textMuted}
          fontSize={10}
          fontFamily={theme.fontFamily}
        >
          {pct}
        </text>
      ))}

      {/* Habit lines with dotted style and square markers */}
      {habitData.map(({ habit, data, color }) => {
        // Create path for dotted line
        const pathD = data.map((point, i) =>
          `${i === 0 ? 'M' : 'L'} ${xScale(point.completed)} ${yScale(point.day)}`
        ).join(' ');

        return (
          <g key={habit.id}>
            {/* Dotted line */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4,4"
              opacity={0.8}
            />

            {/* Square markers at each data point */}
            {data.map((point, i) => (
              <rect
                key={i}
                x={xScale(point.completed) - 3}
                y={yScale(point.day) - 3}
                width={6}
                height={6}
                fill={color}
                opacity={0.9}
              />
            ))}
          </g>
        );
      })}

      {/* Axis lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke={theme.border}
        strokeWidth={1}
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke={theme.border}
        strokeWidth={1}
      />
    </svg>
  );
};
