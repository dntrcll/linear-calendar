import React, { useState, useEffect, useMemo } from 'react';
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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [editingSleep, setEditingSleep] = useState(null);
  const [editingSleepValue, setEditingSleepValue] = useState('');

  const [visibleHabits, setVisibleHabits] = useState({});
  const [hoveredHabit, setHoveredHabit] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);

  const [editingHabit, setEditingHabit] = useState(null);
  const [editingHabitName, setEditingHabitName] = useState('');

  // Responsive layout tracking
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine responsive breakpoints
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

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
        .gte('recorded_at', startDate)
        .lte('recorded_at', endDate);

      setMetrics(metricsData || []);
      setLoading(false);

      // Initialize all habits as visible
      const visible = {};
      result.habits.forEach(h => visible[h.id] = true);
      setVisibleHabits(visible);
    };

    loadData();
  }, [user?.uid, currentYear, currentMonth]);

  // Cleanup hoverTimeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

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

  const handleEditHabit = (habit) => {
    setEditingHabit(habit.id);
    setEditingHabitName(habit.name);
    setHoveredHabit(null); // Close hover menu
  };

  const handleSaveHabitName = async () => {
    if (!editingHabitName.trim() || !editingHabit) return;
    await updateHabit(editingHabit, { name: editingHabitName.trim() });
    const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
    setHabits(result.habits);
    setEditingHabit(null);
    setEditingHabitName('');
  };

  const handleCancelEditHabit = () => {
    setEditingHabit(null);
    setEditingHabitName('');
  };

  const handleHabitHover = (habitId) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (hoveredHabit !== habitId) {
      setHoveredHabit(habitId);
    }
  };

  const handleHabitLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setHoveredHabit(null);
    }, 300);
    setHoverTimeout(timeout);
  };

  const toggleHabitVisibility = (habitId) => {
    setVisibleHabits(prev => ({
      ...prev,
      [habitId]: !prev[habitId]
    }));
  };

  const handleSleepSave = async (dayNum) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const sleepHours = parseFloat(editingSleepValue);

    if (isNaN(sleepHours) || sleepHours < 0 || sleepHours > 24) {
      setEditingSleep(null);
      setEditingSleepValue('');
      return;
    }

    // Save to life_metrics - check if exists first, then update or insert
    const { data: existing } = await supabase
      .from('life_metrics')
      .select('id')
      .eq('user_id', user.uid)
      .eq('recorded_at', dateStr)
      .eq('metric_name', 'sleep_hours')
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('life_metrics')
        .update({
          metric_value: sleepHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('life_metrics')
        .insert({
          user_id: user.uid,
          recorded_at: dateStr,
          metric_type: 'manual',
          metric_name: 'sleep_hours',
          metric_value: sleepHours,
          created_at: new Date().toISOString()
        });
      error = insertError;
    }

    if (error) {
      console.error('Error saving sleep:', error);
    }

    // Reload metrics immediately
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;
    const { data: metricsData } = await supabase
      .from('life_metrics')
      .select('*')
      .eq('user_id', user.uid)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate);

    setMetrics(metricsData || []);

    setEditingSleep(null);
    setEditingSleepValue('');
  };

  const getSleepHours = (dayNum) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const sleepMetric = metrics.find(m => {
      const metricDate = m.recorded_at?.split('T')[0];
      return metricDate === dateStr && m.metric_name === 'sleep_hours';
    });
    return sleepMetric ? sleepMetric.metric_value : null;
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
      overflow: 'auto',
      padding: '16px',
      fontFamily: theme.fontFamily
    }}>
      <div style={{
        height: '100%',
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 0
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
            {[
              { label: 'BUILD', value: `${buildPct}%`, color: '#10b981' },
              { label: 'ELIMINATE', value: `${eliminatePct}%`, color: '#ef4444' },
              { label: 'LOGGED', value: `${daysLogged}/${daysInMonth}`, color: null }
            ].map(pill => (
              <div key={pill.label} style={{
                flex: 1,
                padding: '8px 12px',
                background: pill.color
                  ? (config.darkMode ? `${pill.color}14` : `${pill.color}0d`)
                  : (config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                border: `1px solid ${pill.color || theme.border}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: 0,
                height: 40
              }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: pill.color || theme.textMuted,
                  letterSpacing: '0.05em',
                  fontFamily: theme.fontFamily,
                  flexShrink: 0
                }}>
                  {pill.label}
                </span>
                <span style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: pill.color || theme.text,
                  fontFamily: theme.fontFamily,
                  flexShrink: 0,
                  marginLeft: 8
                }}>
                  {pill.value}
                </span>
              </div>
            ))}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 10,
            flexShrink: 0
          }}>
            <div style={{
              padding: '10px 14px',
              background: config.darkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
              border: '1.5px solid #6366f1',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#6366f1',
                letterSpacing: '0.08em',
                fontFamily: theme.fontFamily
              }}>
                SLEEP
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {avgSleep || '–'}h
              </span>
            </div>

            <div style={{
              padding: '10px 14px',
              background: config.darkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
              border: '1.5px solid #f59e0b',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#f59e0b',
                letterSpacing: '0.08em',
                fontFamily: theme.fontFamily
              }}>
                MOOD
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {avgMood || '–'}/10
              </span>
            </div>

            <div style={{
              padding: '10px 14px',
              background: config.darkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
              border: '1.5px solid #10b981',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.08em',
                fontFamily: theme.fontFamily
              }}>
                ENERGY
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {avgEnergy || '–'}/10
              </span>
            </div>

            <div style={{
              padding: '10px 14px',
              background: config.darkMode ? 'rgba(236, 72, 153, 0.08)' : 'rgba(236, 72, 153, 0.05)',
              border: '1.5px solid #ec4899',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#ec4899',
                letterSpacing: '0.08em',
                fontFamily: theme.fontFamily
              }}>
                WORKOUTS
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                fontFamily: theme.fontFamily
              }}>
                {workoutCount || 0}
              </span>
            </div>

            <div style={{
              flex: 1,
              padding: '12px 16px',
              background: config.darkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
              border: '2px solid #8b5cf6',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: config.darkMode ? '0 2px 8px rgba(139, 92, 246, 0.2)' : '0 2px 8px rgba(139, 92, 246, 0.12)'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#8b5cf6',
                letterSpacing: '0.1em',
                fontFamily: theme.fontFamily
              }}>
                COMPLETION
              </span>
              <span style={{
                fontSize: 24,
                fontWeight: 800,
                color: theme.text,
                fontFamily: theme.fontFamily,
                letterSpacing: '-0.02em'
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
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? undefined : (isTablet ? '1fr 350px' : '1fr 400px'),
            gap: 12,
            overflow: 'hidden'
          }}>
            {/* Habit Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>
            {/* Selected Habit Action Bar */}
            {selectedHabit && !editingHabit && (() => {
              const habit = habits.find(h => h.id === selectedHabit);
              const habitIndex = habits.findIndex(h => h.id === selectedHabit);
              if (!habit) return null;
              const isFirst = habitIndex === 0;
              const isLast = habitIndex === habits.length - 1;
              const habitColor = habit.habit_type === 'build' ? '#10b981' : '#ef4444';

              const ActionBtn = ({ onClick, disabled, title: btnTitle, hoverBg, hoverColor, children }) => (
                <button
                  onClick={onClick}
                  disabled={disabled}
                  title={btnTitle}
                  style={{
                    height: 30,
                    padding: '0 10px',
                    background: 'transparent',
                    border: `1px solid transparent`,
                    borderRadius: 7,
                    color: disabled
                      ? (config.darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
                      : (config.darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'),
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: theme.fontFamily,
                    transition: 'all 0.12s ease',
                    opacity: disabled ? 0.4 : 1
                  }}
                  onMouseEnter={e => {
                    if (!disabled) {
                      e.currentTarget.style.background = hoverBg || (config.darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)');
                      e.currentTarget.style.borderColor = config.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
                      if (hoverColor) e.currentTarget.style.color = hoverColor;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = disabled
                      ? (config.darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
                      : (config.darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)');
                  }}
                >
                  {children}
                </button>
              );

              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: config.darkMode
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: '10px 10px 0 0',
                  borderBottom: 'none'
                }}>
                  {/* Habit name badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    background: `${habitColor}10`,
                    border: `1px solid ${habitColor}25`,
                    borderRadius: 6
                  }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: habitColor
                    }} />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: habitColor,
                      fontFamily: theme.fontFamily,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      {habit.name}
                    </span>
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: 1,
                    height: 18,
                    background: config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderRadius: 1
                  }} />

                  {/* Actions */}
                  <ActionBtn
                    onClick={() => handleMoveHabit(selectedHabit, 'up')}
                    disabled={isFirst}
                    title="Move left"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    <span>Left</span>
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => handleMoveHabit(selectedHabit, 'down')}
                    disabled={isLast}
                    title="Move right"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                    <span>Right</span>
                  </ActionBtn>

                  <div style={{
                    width: 1,
                    height: 18,
                    background: config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderRadius: 1
                  }} />

                  <ActionBtn
                    onClick={() => { handleEditHabit(habit); }}
                    title="Rename"
                    hoverBg={`${accentColor}12`}
                    hoverColor={accentColor}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                    <span>Rename</span>
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => { handleDeleteHabit(selectedHabit); setSelectedHabit(null); }}
                    title="Delete"
                    hoverBg={config.darkMode ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'}
                    hoverColor="#ef4444"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                    <span>Delete</span>
                  </ActionBtn>

                  {/* Spacer + Close */}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => setSelectedHabit(null)}
                    style={{
                      width: 24,
                      height: 24,
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      color: config.darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = config.darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                      e.currentTarget.style.color = theme.text;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = config.darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
                    }}
                    title="Deselect"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              );
            })()}
            <div style={{
              background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: selectedHabit && !editingHabit ? '0 0 10px 10px' : 10,
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: isMobile ? '60vh' : undefined,
              WebkitOverflowScrolling: 'touch'
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
                  minWidth: 600 + habits.length * 120,
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: 12,
                  fontFamily: theme.fontFamily
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        borderBottom: `2px solid ${theme.border}`,
                        padding: '16px 20px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: theme.textMuted,
                        textAlign: 'left',
                        zIndex: 110,
                        fontFamily: theme.fontFamily,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        width: '80px'
                      }}>
                        Day
                      </th>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        borderBottom: `2px solid ${theme.border}`,
                        padding: '16px 20px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: theme.textMuted,
                        textAlign: 'center',
                        zIndex: 100,
                        fontFamily: theme.fontFamily,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        width: '80px'
                      }}>
                        Mood
                      </th>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        borderBottom: `2px solid ${theme.border}`,
                        padding: '16px 20px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: theme.textMuted,
                        textAlign: 'center',
                        zIndex: 100,
                        fontFamily: theme.fontFamily,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        width: '90px'
                      }}>
                        Sleep
                      </th>
                      <th style={{
                        position: 'sticky',
                        top: 0,
                        background: config.darkMode ? '#0f172a' : '#ffffff',
                        borderBottom: `2px solid ${theme.border}`,
                        padding: '16px 20px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: theme.textMuted,
                        textAlign: 'left',
                        minWidth: 240,
                        maxWidth: 400,
                        zIndex: 100,
                        fontFamily: theme.fontFamily,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}>
                        Memorable Moment
                      </th>
                      {habits.map((habit, index) => (
                        <th
                          key={habit.id}
                          onClick={() => {
                            if (!editingHabit) {
                              setSelectedHabit(selectedHabit === habit.id ? null : habit.id);
                            }
                          }}
                          style={{
                            position: 'sticky',
                            top: 0,
                            background: selectedHabit === habit.id
                              ? (config.darkMode ? 'rgba(30, 40, 60, 1)' : 'rgba(240, 245, 255, 1)')
                              : (config.darkMode ? '#0f172a' : '#ffffff'),
                            borderBottom: selectedHabit === habit.id
                              ? `2px solid ${accentColor}60`
                              : `2px solid ${theme.border}`,
                            padding: '16px 14px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: habit.habit_type === 'build' ? '#10b981' : '#ef4444',
                            textAlign: 'center',
                            minWidth: 95,
                            maxWidth: 110,
                            zIndex: 100,
                            fontFamily: theme.fontFamily,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease, border-color 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          {editingHabit === habit.id ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              width: '100%'
                            }}>
                              <input
                                type="text"
                                value={editingHabitName}
                                onChange={(e) => setEditingHabitName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { handleSaveHabitName(); setSelectedHabit(null); }
                                  if (e.key === 'Escape') { handleCancelEditHabit(); setSelectedHabit(null); }
                                }}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                style={{
                                  padding: '5px 8px',
                                  background: config.darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                  border: `1.5px solid ${accentColor}`,
                                  borderRadius: 6,
                                  color: theme.text,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  fontFamily: theme.fontFamily,
                                  textAlign: 'center',
                                  outline: 'none',
                                  width: '100%',
                                  boxShadow: `0 0 0 3px ${accentColor}12`
                                }}
                              />
                              <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveHabitName(); setSelectedHabit(null); }}
                                  style={{
                                    width: 28,
                                    height: 26,
                                    padding: 0,
                                    background: `${accentColor}15`,
                                    border: `1px solid ${accentColor}30`,
                                    borderRadius: 6,
                                    color: accentColor,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = `${accentColor}25`;
                                    e.currentTarget.style.borderColor = accentColor;
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = `${accentColor}15`;
                                    e.currentTarget.style.borderColor = `${accentColor}30`;
                                  }}
                                  title="Save"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelEditHabit(); setSelectedHabit(null); }}
                                  style={{
                                    width: 28,
                                    height: 26,
                                    padding: 0,
                                    background: config.darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                    borderRadius: 6,
                                    color: theme.textSec,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                                    e.currentTarget.style.color = theme.text;
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = config.darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                                    e.currentTarget.style.color = theme.textSec;
                                  }}
                                  title="Cancel"
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}>
                              {habit.name}
                            </div>
                          )}
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
                            position: 'sticky',
                            left: 0,
                            zIndex: 5,
                            background: config.darkMode ? '#0f172a' : '#ffffff',
                            padding: '14px 20px',
                            borderBottom: `1px solid ${theme.border}`,
                            fontSize: 13,
                            fontWeight: 600,
                            color: theme.textSec,
                            fontFamily: theme.fontFamily,
                            width: '80px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700 }}>{dayNum}</span>
                              <span style={{
                                color: theme.textMuted,
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: '0.02em'
                              }}>{weekday}</span>
                            </div>
                          </td>
                          <td style={{
                            padding: '14px 20px',
                            borderBottom: `1px solid ${theme.border}`,
                            textAlign: 'center',
                            position: 'relative',
                            width: '80px'
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
                            padding: '14px 20px',
                            borderBottom: `1px solid ${theme.border}`,
                            textAlign: 'center',
                            width: '90px'
                          }}>
                            {editingSleep === dayNum ? (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={editingSleepValue}
                                onChange={(e) => setEditingSleepValue(e.target.value)}
                                onBlur={() => handleSleepSave(dayNum)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSleepSave(dayNum)}
                                autoFocus
                                style={{
                                  width: '60px',
                                  padding: '4px 6px',
                                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                  border: `1px solid ${accentColor}`,
                                  borderRadius: 4,
                                  color: theme.text,
                                  fontSize: 11,
                                  fontFamily: theme.fontFamily,
                                  textAlign: 'center'
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingSleep(dayNum);
                                  setEditingSleepValue(getSleepHours(dayNum) || '');
                                }}
                                style={{
                                  cursor: 'pointer',
                                  color: getSleepHours(dayNum) ? theme.text : theme.textMuted,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontStyle: getSleepHours(dayNum) ? 'normal' : 'italic',
                                  fontFamily: theme.fontFamily
                                }}
                              >
                                {getSleepHours(dayNum) ? `${getSleepHours(dayNum)}h` : '—'}
                              </span>
                            )}
                          </td>
                          <td style={{
                            padding: '14px 20px',
                            borderBottom: `1px solid ${theme.border}`,
                            minWidth: 240,
                            maxWidth: 400
                          }}>
                            {editingMemorable === dayNum ? (
                              <input
                                type="text"
                                value={editingMemoText}
                                onChange={(e) => setEditingMemoText(e.target.value)}
                                onBlur={() => handleMemorableSave(dayNum)}
                                onKeyPress={(e) => e.key === 'Enter' && handleMemorableSave(dayNum)}
                                autoFocus
                                placeholder="Something memorable..."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: config.darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                  border: `1px solid ${accentColor}`,
                                  borderRadius: 6,
                                  color: theme.text,
                                  fontSize: 12,
                                  fontFamily: theme.fontFamily,
                                  lineHeight: 1.5,
                                  letterSpacing: '0.01em',
                                  fontWeight: 500
                                }}
                              />
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingMemorable(dayNum);
                                  setEditingMemoText(dayData.memorable_moment);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  color: dayData.memorable_moment ? theme.text : theme.textMuted,
                                  fontSize: 12,
                                  fontFamily: theme.fontFamily,
                                  lineHeight: 1.6,
                                  letterSpacing: '0.01em',
                                  whiteSpace: 'normal',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  fontWeight: dayData.memorable_moment ? 500 : 500,
                                  opacity: dayData.memorable_moment ? 1 : 0.5,
                                  padding: '2px 0',
                                  transition: 'opacity 0.15s'
                                }}
                                title={dayData.memorable_moment}
                                onMouseEnter={(e) => {
                                  if (dayData.memorable_moment) {
                                    e.currentTarget.style.opacity = '0.7';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = dayData.memorable_moment ? '1' : '0.5';
                                }}
                              >
                                {dayData.memorable_moment || 'Click to add...'}
                              </div>
                            )}
                          </td>
                          {habits.map(habit => (
                            <td
                              key={habit.id}
                              onClick={() => handleToggle(dayNum, habit.id)}
                              style={{
                                padding: '14px',
                                borderBottom: `1px solid ${theme.border}`,
                                textAlign: 'center',
                                cursor: 'pointer',
                                fontSize: 18,
                                fontWeight: 700,
                                color: isCompleted(dayNum, habit.id)
                                  ? (habit.habit_type === 'build' ? '#10b981' : '#ef4444')
                                  : theme.border,
                                userSelect: 'none',
                                fontFamily: theme.fontFamily,
                                transition: 'all 0.15s'
                              }}
                            >
                              {isCompleted(dayNum, habit.id) ? '✓' : '·'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            </div>

            {/* Habit Trends Chart - Premium Vertical */}
            <div style={{
              background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Chart Header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${theme.border}`,
                background: config.darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'
              }}>
                <h3 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.text,
                  margin: 0,
                  marginBottom: 4,
                  letterSpacing: '-0.01em',
                  fontFamily: theme.fontFamily
                }}>
                  Habit Trends
                </h3>
                <p style={{
                  fontSize: 10,
                  color: theme.textMuted,
                  margin: 0,
                  fontFamily: theme.fontFamily
                }}>
                  Track daily completion over the month
                </p>
              </div>

              {/* Chart */}
              <div style={{ flex: 1, minHeight: 200, padding: 12 }}>
                <SmoothHabitChart
                  theme={theme}
                  config={config}
                  habits={habits}
                  completions={completions}
                  year={currentYear}
                  month={currentMonth}
                  daysInMonth={daysInMonth}
                  visibleHabits={visibleHabits}
                />
              </div>

              {/* Legend with Toggle Controls */}
              <div style={{
                padding: '10px 14px',
                borderTop: `1px solid ${theme.border}`,
                background: config.darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'
              }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6
                }}>
                  {habits.map((habit, index) => {
                    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];
                    const color = colors[index % colors.length];
                    const isVisible = visibleHabits[habit.id];

                    return (
                      <button
                        key={habit.id}
                        onClick={() => toggleHabitVisibility(habit.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 10,
                          fontWeight: 600,
                          color: isVisible ? theme.text : theme.textMuted,
                          fontFamily: theme.fontFamily,
                          background: isVisible ? `${color}10` : 'transparent',
                          border: `1px solid ${isVisible ? color : theme.border}`,
                          borderRadius: 6,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          lineHeight: 1.2
                        }}
                      >
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: color,
                          flexShrink: 0,
                          opacity: isVisible ? 1 : 0.3
                        }} />
                        <span style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 80
                        }}>
                          {habit.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Interactive Habit Trend Chart - Recharts-based (matches Metrics dashboard style)
const SmoothHabitChart = ({ theme, config, habits, completions, year, month, daysInMonth, visibleHabits }) => {
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'];

  // Build chart data: per-day rolling 7-day completion rate for each habit
  const chartData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const point = { day: dayNum };

      habits.forEach((habit, index) => {
        // 7-day rolling window completion rate
        const windowStart = Math.max(1, dayNum - 6);
        let completed = 0;
        let total = 0;
        for (let d = windowStart; d <= dayNum; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const comp = completions.find(c => c.date === dateStr && c.habit_id === habit.id);
          if (comp?.completed) completed++;
          total++;
        }
        point[`habit_${index}`] = total > 0 ? Math.round((completed / total) * 100) : 0;
      });

      return point;
    });
  }, [habits, completions, year, month, daysInMonth]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div style={{
        background: config.darkMode ? '#1a1a2e' : '#fff',
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 6,
          fontFamily: theme.fontFamily
        }}>
          Day {label}
        </div>
        {payload.map((entry, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: theme.textSec,
            fontFamily: theme.fontFamily,
            marginBottom: 2
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0
            }} />
            <span style={{ flex: 1 }}>{entry.name}</span>
            <span style={{ fontWeight: 700, color: theme.text }}>{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="day"
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 10, fontFamily: theme.fontFamily }}
          tickLine={false}
          axisLine={{ stroke: theme.border }}
          interval={Math.floor(daysInMonth / 7)}
        />
        <YAxis
          domain={[0, 100]}
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 10, fontFamily: theme.fontFamily }}
          tickLine={false}
          axisLine={{ stroke: theme.border }}
          tickFormatter={v => `${v}%`}
          ticks={[0, 25, 50, 75, 100]}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        {habits.map((habit, index) => {
          if (!visibleHabits[habit.id]) return null;
          return (
            <Line
              key={habit.id}
              type="monotone"
              dataKey={`habit_${index}`}
              name={habit.name}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: colors[index % colors.length], stroke: '#fff', strokeWidth: 2 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};
