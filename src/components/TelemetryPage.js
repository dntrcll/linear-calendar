import React, { useState, useEffect } from 'react';
import {
  loadMonthTelemetry,
  toggleHabitCompletion,
  updateDayTelemetry,
  createHabit,
  archiveHabit,
  updateHabit
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
  const [editingHabit, setEditingHabit] = useState(null);

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

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Delete this habit? Completion data will be preserved.')) return;
    await archiveHabit(habitId);
    const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
    setHabits(result.habits);
  };

  const handleMoveHabit = async (habitId, direction) => {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    const newIndex = direction === 'up' ? habitIndex - 1 : habitIndex + 1;
    if (newIndex < 0 || newIndex >= habits.length) return;

    const newHabits = [...habits];
    [newHabits[habitIndex], newHabits[newIndex]] = [newHabits[newIndex], newHabits[habitIndex]];

    // Update display_order for both habits
    await updateHabit(newHabits[habitIndex].id, { display_order: habitIndex });
    await updateHabit(newHabits[newIndex].id, { display_order: newIndex });

    const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
    setHabits(result.habits);
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

  const moodMetrics = metrics.filter(m => m.metric_name === 'mood');
  const avgMood = moodMetrics.length > 0
    ? (moodMetrics.reduce((sum, m) => sum + m.metric_value, 0) / moodMetrics.length).toFixed(1)
    : 0;

  const energyMetrics = metrics.filter(m => m.metric_name === 'energy');
  const avgEnergy = energyMetrics.length > 0
    ? (energyMetrics.reduce((sum, m) => sum + m.metric_value, 0) / energyMetrics.length).toFixed(1)
    : 0;

  const workoutCount = metrics.filter(m => m.metric_name === 'workout_type' && m.metric_value).length;

  const totalHabitCompletions = completions.filter(c => c.completed).length;
  const totalHabitDays = daysInMonth * habits.length;
  const overallCompletion = totalHabitDays > 0 ? Math.round((totalHabitCompletions / totalHabitDays) * 100) : 0;

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

        {/* Monthly Summary - Compact */}
        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: 8,
            flexShrink: 0
          }}>
            <div style={{
              padding: '8px 10px',
              background: config.darkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
              border: '1px solid #6366f1',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#6366f1',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                SLEEP
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {avgSleep || '–'}h
              </span>
            </div>

            <div style={{
              padding: '8px 10px',
              background: config.darkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
              border: '1px solid #f59e0b',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#f59e0b',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                MOOD
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {avgMood || '–'}/10
              </span>
            </div>

            <div style={{
              padding: '8px 10px',
              background: config.darkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
              border: '1px solid #10b981',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                ENERGY
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {avgEnergy || '–'}/10
              </span>
            </div>

            <div style={{
              padding: '8px 10px',
              background: config.darkMode ? 'rgba(236, 72, 153, 0.08)' : 'rgba(236, 72, 153, 0.05)',
              border: '1px solid #ec4899',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#ec4899',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                WORKOUTS
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {workoutCount || 0}
              </span>
            </div>

            <div style={{
              padding: '8px 10px',
              background: config.darkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
              border: '1px solid #8b5cf6',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#8b5cf6',
                letterSpacing: '0.05em',
                fontFamily: theme.fontFamily
              }}>
                COMPLETION
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {overallCompletion}%
              </span>
            </div>
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
                      {habits.map((habit, index) => (
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
                          minWidth: 90,
                          maxWidth: 110,
                          zIndex: 2,
                          fontFamily: theme.fontFamily
                        }}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            alignItems: 'center'
                          }}>
                            <div style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}>
                              {habit.name}
                            </div>
                            <div style={{ display: 'flex', gap: 2, opacity: 0.5 }}>
                              <button
                                onClick={() => handleMoveHabit(habit.id, 'up')}
                                disabled={index === 0}
                                style={{
                                  padding: 2,
                                  background: 'transparent',
                                  border: 'none',
                                  color: habit.habit_type === 'build' ? '#10b981' : '#ef4444',
                                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                                  opacity: index === 0 ? 0.2 : 1,
                                  fontSize: 10
                                }}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveHabit(habit.id, 'down')}
                                disabled={index === habits.length - 1}
                                style={{
                                  padding: 2,
                                  background: 'transparent',
                                  border: 'none',
                                  color: habit.habit_type === 'build' ? '#10b981' : '#ef4444',
                                  cursor: index === habits.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: index === habits.length - 1 ? 0.2 : 1,
                                  fontSize: 10
                                }}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => handleDeleteHabit(habit.id)}
                                style={{
                                  padding: 2,
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: 10
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
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

            {/* Habit Trends Chart - Smooth Lines */}
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
                marginBottom: 8,
                fontFamily: theme.fontFamily
              }}>
                Habit Trends
              </h3>

              <p style={{
                fontSize: 10,
                color: theme.textMuted,
                margin: 0,
                marginBottom: 12,
                fontFamily: theme.fontFamily
              }}>
                Daily completion rate over time
              </p>

              {/* Chart */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <SmoothHabitChart
                  theme={theme}
                  config={config}
                  habits={habits}
                  completions={completions}
                  year={currentYear}
                  month={currentMonth}
                  daysInMonth={daysInMonth}
                />
              </div>

              {/* Legend */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${theme.border}`,
                maxHeight: 60,
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
                        gap: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        color: theme.textSec,
                        fontFamily: theme.fontFamily
                      }}
                    >
                      <div style={{
                        width: 10,
                        height: 3,
                        background: color,
                        borderRadius: 2
                      }} />
                      {habit.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Smooth Habit Chart - Clean horizontal chart with bezier curves
const SmoothHabitChart = ({ theme, config, habits, completions, year, month, daysInMonth }) => {
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];

  // Calculate completion rate per day for each habit
  const habitData = habits.map((habit, index) => {
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const completion = completions.find(c => c.date === dateStr && c.habit_id === habit.id);
      return {
        day: dayNum,
        completed: completion?.completed ? 100 : 0
      };
    });

    // Apply 3-day rolling average for smoothing
    const smoothed = data.map((d, i) => {
      const start = Math.max(0, i - 1);
      const end = Math.min(data.length, i + 2);
      const window = data.slice(start, end);
      const avg = window.reduce((sum, w) => sum + w.completed, 0) / window.length;
      return { day: d.day, value: avg };
    });

    return { habit, data: smoothed, color: colors[index % colors.length] };
  });

  const width = 380;
  const height = 220;
  const padding = { top: 15, right: 15, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (day) => padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth;
  const yScale = (value) => padding.top + chartHeight - (value / 100) * chartHeight;

  // Helper to create smooth bezier curve
  const createSmoothPath = (data) => {
    if (data.length === 0) return '';

    let path = `M ${xScale(data[0].day)} ${yScale(data[0].value)}`;

    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];

      const xMid = (xScale(current.day) + xScale(next.day)) / 2;
      const cp1x = xMid;
      const cp1y = yScale(current.value);
      const cp2x = xMid;
      const cp2y = yScale(next.value);

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xScale(next.day)} ${yScale(next.value)}`;
    }

    return path;
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines - horizontal */}
      {[0, 25, 50, 75, 100].map(pct => (
        <g key={pct}>
          <line
            x1={padding.left}
            y1={yScale(pct)}
            x2={width - padding.right}
            y2={yScale(pct)}
            stroke={theme.border}
            strokeWidth={0.5}
            opacity={0.2}
          />
          <text
            x={padding.left - 6}
            y={yScale(pct) + 3}
            textAnchor="end"
            fill={theme.textMuted}
            fontSize={9}
            fontFamily={theme.fontFamily}
          >
            {pct}%
          </text>
        </g>
      ))}

      {/* Habit lines */}
      {habitData.map(({ habit, data, color }) => {
        const pathD = createSmoothPath(data);

        return (
          <g key={habit.id}>
            {/* Area fill under line */}
            <path
              d={`${pathD} L ${xScale(data[data.length - 1].day)} ${yScale(0)} L ${xScale(data[0].day)} ${yScale(0)} Z`}
              fill={color}
              opacity={0.08}
            />

            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          </g>
        );
      })}

      {/* X-axis labels */}
      {[1, Math.floor(daysInMonth / 2), daysInMonth].map(day => (
        <text
          key={day}
          x={xScale(day)}
          y={height - padding.bottom + 15}
          textAnchor="middle"
          fill={theme.textMuted}
          fontSize={9}
          fontFamily={theme.fontFamily}
        >
          Day {day}
        </text>
      ))}

      {/* Axes */}
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
