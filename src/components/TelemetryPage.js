import React, { useState, useEffect, useMemo } from 'react';
import {
  loadMonthTelemetry,
  toggleHabitCompletion,
  updateDayTelemetry,
  updateMonthSummary,
  createHabit
} from '../services/telemetryService';
import ICONS from '../constants/icons';

// Featured art and quotes for each month
const MONTH_FEATURES = {
  1: {
    art: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80',
    quote: 'New beginnings are often disguised as painful endings.',
    author: 'Lao Tzu'
  },
  2: {
    art: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs'
  },
  3: {
    art: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=1200&q=80',
    quote: 'Spring is nature\'s way of saying, "Let\'s party!"',
    author: 'Robin Williams'
  },
  4: {
    art: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
    quote: 'April showers bring May flowers.',
    author: 'Proverb'
  },
  5: {
    art: 'https://images.unsplash.com/photo-1495954484750-af469f2f9be5?w=1200&q=80',
    quote: 'In every walk with nature, one receives far more than he seeks.',
    author: 'John Muir'
  },
  6: {
    art: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80',
    quote: 'Summer afternoon—summer afternoon; to me those have always been the two most beautiful words.',
    author: 'Henry James'
  },
  7: {
    art: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    quote: 'Rest is not idleness, and to lie sometimes on the grass is not a waste of time.',
    author: 'John Lubbock'
  },
  8: {
    art: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80',
    quote: 'August creates as she slumbers, replete and satisfied.',
    author: 'Joseph Wood Krutch'
  },
  9: {
    art: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    quote: 'Autumn is a second spring when every leaf is a flower.',
    author: 'Albert Camus'
  },
  10: {
    art: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1200&q=80',
    quote: 'October is about trees revealing colors they\'ve hidden all year.',
    author: 'Unknown'
  },
  11: {
    art: 'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=1200&q=80',
    quote: 'Gratitude turns what we have into enough.',
    author: 'Aesop'
  },
  12: {
    art: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1200&q=80',
    quote: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker'
  }
};

const MOOD_EMOJIS = [
  { emoji: '😊', label: 'Great' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😔', label: 'Low' },
  { emoji: '😞', label: 'Bad' }
];

/**
 * Telemetry Page - Personal observation dashboard
 * Redesigned with daily memorable moments, split habits, and better UX
 */
export const TelemetryPage = ({ theme, config, accentColor, user }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const [habits, setHabits] = useState([]);
  const [days, setDays] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [visibleHabits, setVisibleHabits] = useState({});

  // Load telemetry data
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

  const monthFeature = MONTH_FEATURES[currentMonth];

  const reloadData = async () => {
    const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
    setDays(result.days);
    setCompletions(result.completions);
  };

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
        <p style={{ fontSize: 14 }}>Sign in to view your telemetry</p>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      overflow: 'auto',
      background: config.darkMode ? '#0F172A' : '#f8f9fa'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 20px 40px 20px'
      }}>
        {/* Featured Art Hero */}
        <div style={{
          position: 'relative',
          height: 240,
          borderRadius: '0 0 16px 16px',
          overflow: 'hidden',
          marginBottom: 32,
          background: `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%), url(${monthFeature.art})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
            color: '#fff',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            margin: 0
          }}>
            {monthName}
          </h1>
          <p style={{
            fontSize: 16,
            fontFamily: theme.fontFamily,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.95)',
            textAlign: 'center',
            maxWidth: 600,
            lineHeight: 1.6,
            margin: 0
          }}>
            "{monthFeature.quote}"
          </p>
          <p style={{
            fontSize: 13,
            fontFamily: theme.fontFamily,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            margin: 0
          }}>
            — {monthFeature.author}
          </p>

          {/* Month Navigation */}
          <div style={{
            position: 'absolute',
            right: 20,
            top: 20,
            display: 'flex',
            gap: 8
          }}>
            <button
              onClick={goToPreviousMonth}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontFamily: theme.fontFamily
              }}
            >
              <ICONS.ChevronLeft width={20} height={20} />
            </button>
            <button
              onClick={goToNextMonth}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontFamily: theme.fontFamily
              }}
            >
              <ICONS.ChevronRight width={20} height={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{
            padding: 60,
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: 14,
            fontFamily: theme.fontFamily
          }}>
            Loading telemetry...
          </div>
        ) : (
          <>
            {/* Build Habits Section */}
            <HabitSection
              title="Build Habits"
              subtitle="Positive behaviors to cultivate"
              color="#10b981"
              theme={theme}
              config={config}
              accentColor={accentColor}
              habits={habits.filter(h => h.habit_type === 'build')}
              completions={completions}
              days={days}
              year={currentYear}
              month={currentMonth}
              user={user}
              onReload={reloadData}
              onAddHabit={async (name) => {
                const maxOrder = Math.max(...habits.map(h => h.display_order), 0);
                await createHabit(user.uid, name, 'build', maxOrder + 1);
                const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
                setHabits(result.habits);
              }}
            />

            {/* Eliminate Habits Section */}
            <HabitSection
              title="Eliminate Habits"
              subtitle="Behaviors to reduce or remove"
              color="#ef4444"
              theme={theme}
              config={config}
              accentColor={accentColor}
              habits={habits.filter(h => h.habit_type === 'eliminate')}
              completions={completions}
              days={days}
              year={currentYear}
              month={currentMonth}
              user={user}
              onReload={reloadData}
              onAddHabit={async (name) => {
                const maxOrder = Math.max(...habits.map(h => h.display_order), 0);
                await createHabit(user.uid, name, 'eliminate', maxOrder + 1);
                const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
                setHabits(result.habits);
              }}
              isEliminate
            />

            {/* Habit Trends Chart */}
            <HabitTrendsChart
              theme={theme}
              config={config}
              accentColor={accentColor}
              habits={habits}
              completions={completions}
              year={currentYear}
              month={currentMonth}
              visibleHabits={visibleHabits}
              onToggleHabit={(habitId) => {
                setVisibleHabits({
                  ...visibleHabits,
                  [habitId]: !visibleHabits[habitId]
                });
              }}
            />

            {/* Monthly Summary */}
            <MonthlySummary
              theme={theme}
              config={config}
              habits={habits}
              completions={completions}
              days={days}
              year={currentYear}
              month={currentMonth}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Habit Section Component
const HabitSection = ({
  title,
  subtitle,
  color,
  theme,
  config,
  accentColor,
  habits,
  completions,
  days,
  year,
  month,
  user,
  onReload,
  onAddHabit,
  isEliminate = false
}) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [editingMood, setEditingMood] = useState(null);
  const [editingMemorable, setEditingMemorable] = useState(null);

  const getDayData = (dayNum) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return days.find(d => d.date === dateStr) || { date: dateStr, mood_emoji: '', memorable_moment: '' };
  };

  const isCompleted = (dayNum, habitId) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const completion = completions.find(c => c.date === dateStr && c.habit_id === habitId);
    return completion?.completed || false;
  };

  const handleToggle = async (dayNum, habitId) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const currentStatus = isCompleted(dayNum, habitId);
    await toggleHabitCompletion(user.uid, dateStr, habitId, !currentStatus);
    onReload();
  };

  const handleMoodSelect = async (dayNum, emoji) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = getDayData(dayNum);
    await updateDayTelemetry(user.uid, dateStr, dayData.mood_score, dayData.note, emoji, dayData.memorable_moment);
    setEditingMood(null);
    onReload();
  };

  const handleMemorableSave = async (dayNum, text) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = getDayData(dayNum);
    await updateDayTelemetry(user.uid, dateStr, dayData.mood_score, dayData.note, dayData.mood_emoji, text);
    setEditingMemorable(null);
    onReload();
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName.trim());
    setNewHabitName('');
    setShowAddHabit(false);
  };

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
      border: `2px solid ${color}`,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
            color,
            margin: 0,
            marginBottom: 4,
            letterSpacing: '-0.01em'
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: 13,
            fontFamily: theme.fontFamily,
            color: theme.textMuted,
            margin: 0
          }}>
            {subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowAddHabit(!showAddHabit)}
          style={{
            padding: '8px 16px',
            background: `${color}15`,
            border: `1px solid ${color}`,
            borderRadius: 8,
            color,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ICONS.Plus width={14} height={14} />
          Add Habit
        </button>
      </div>

      {showAddHabit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
            placeholder="Habit name..."
            autoFocus
            style={{
              flex: 1,
              padding: '10px 14px',
              background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              fontSize: 13,
              fontFamily: theme.fontFamily
            }}
          />
          <button
            onClick={handleAddHabit}
            style={{
              padding: '10px 20px',
              background: color,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: theme.fontFamily,
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Grid */}
      {habits.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: theme.textMuted,
          fontSize: 13,
          fontFamily: theme.fontFamily
        }}>
          No habits in this category yet. Add your first {isEliminate ? 'habit to eliminate' : 'habit to build'}.
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 13,
            fontFamily: theme.fontFamily
          }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky',
                  left: 0,
                  background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                  padding: '10px 12px',
                  borderBottom: `2px solid ${color}`,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontFamily,
                  color: theme.text,
                  textAlign: 'left',
                  zIndex: 3
                }}>
                  Day
                </th>
                <th style={{
                  position: 'sticky',
                  left: 50,
                  background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                  padding: '10px 12px',
                  borderBottom: `2px solid ${color}`,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontFamily,
                  color: theme.text,
                  textAlign: 'center',
                  zIndex: 3
                }}>
                  Mood
                </th>
                <th style={{
                  position: 'sticky',
                  left: 100,
                  background: config.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                  padding: '10px 12px',
                  borderBottom: `2px solid ${color}`,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontFamily,
                  color: theme.text,
                  textAlign: 'left',
                  minWidth: 200,
                  zIndex: 3
                }}>
                  Memorable Moment
                </th>
                {habits.map(habit => (
                  <th key={habit.id} style={{
                    padding: '10px 8px',
                    borderBottom: `2px solid ${color}`,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: theme.fontFamily,
                    color: theme.text,
                    textAlign: 'center',
                    minWidth: 80,
                    maxWidth: 120,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {habit.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dayNum => {
                const dayData = getDayData(dayNum);
                return (
                  <tr key={dayNum}>
                    <td style={{
                      position: 'sticky',
                      left: 0,
                      background: config.darkMode ? '#0F172A' : '#fff',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${theme.border}20`,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      color: theme.textSec,
                      zIndex: 2
                    }}>
                      {dayNum}
                    </td>
                    <td style={{
                      position: 'sticky',
                      left: 50,
                      background: config.darkMode ? '#0F172A' : '#fff',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${theme.border}20`,
                      textAlign: 'center',
                      zIndex: 2
                    }}>
                      {editingMood === dayNum ? (
                        <div style={{
                          display: 'flex',
                          gap: 4,
                          position: 'absolute',
                          background: config.darkMode ? '#1E293B' : '#fff',
                          border: `1px solid ${theme.border}`,
                          borderRadius: 8,
                          padding: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 10
                        }}>
                          {MOOD_EMOJIS.map(({ emoji }) => (
                            <button
                              key={emoji}
                              onClick={() => handleMoodSelect(dayNum, emoji)}
                              style={{
                                padding: 6,
                                background: 'transparent',
                                border: 'none',
                                fontSize: 20,
                                cursor: 'pointer'
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span
                          onClick={() => setEditingMood(dayNum)}
                          style={{
                            fontSize: 20,
                            cursor: 'pointer',
                            opacity: dayData.mood_emoji ? 1 : 0.3
                          }}
                        >
                          {dayData.mood_emoji || '😐'}
                        </span>
                      )}
                    </td>
                    <td style={{
                      position: 'sticky',
                      left: 100,
                      background: config.darkMode ? '#0F172A' : '#fff',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${theme.border}20`,
                      zIndex: 2
                    }}>
                      {editingMemorable === dayNum ? (
                        <input
                          type="text"
                          value={dayData.memorable_moment}
                          onChange={(e) => {
                            // Update local state temporarily
                            const newDays = days.map(d =>
                              d.date === dayData.date
                                ? { ...d, memorable_moment: e.target.value }
                                : d
                            );
                            // This will need to be handled via state
                          }}
                          onBlur={() => {
                            handleMemorableSave(dayNum, dayData.memorable_moment);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleMemorableSave(dayNum, dayData.memorable_moment);
                            }
                          }}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                            border: `1px solid ${color}`,
                            borderRadius: 6,
                            color: theme.text,
                            fontSize: 12,
                            fontFamily: theme.fontFamily
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => setEditingMemorable(dayNum)}
                          style={{
                            cursor: 'pointer',
                            color: dayData.memorable_moment ? theme.text : theme.textMuted,
                            fontSize: 12,
                            fontFamily: theme.fontFamily,
                            fontStyle: dayData.memorable_moment ? 'normal' : 'italic',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
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
                          padding: '8px',
                          borderBottom: `1px solid ${theme.border}20`,
                          textAlign: 'center',
                          cursor: 'pointer',
                          fontSize: 18,
                          fontWeight: 700,
                          fontFamily: theme.fontFamily,
                          color: isCompleted(dayNum, habit.id) ? color : theme.border,
                          userSelect: 'none'
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
        </div>
      )}
    </div>
  );
};

// Habit Trends Chart with toggles
const HabitTrendsChart = ({
  theme,
  config,
  accentColor,
  habits,
  completions,
  year,
  month,
  visibleHabits,
  onToggleHabit
}) => {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build data for each habit
  const habitData = habits.map(habit => {
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const completion = completions.find(c => c.date === dateStr && c.habit_id === habit.id);
      return {
        day: dayNum,
        completed: completion?.completed ? 1 : 0
      };
    });

    // Calculate cumulative percentage
    let cumulative = 0;
    const cumulativeData = data.map(d => {
      cumulative += d.completed;
      return {
        day: d.day,
        percentage: (cumulative / d.day) * 100
      };
    });

    return {
      habit,
      data: cumulativeData
    };
  });

  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (day) => padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth;
  const yScale = (percentage) => padding.top + chartHeight - (percentage / 100) * chartHeight;

  const habitColors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#06b6d4'
  ];

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24
    }}>
      <h2 style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: theme.fontFamily,
        color: theme.text,
        margin: 0,
        marginBottom: 16,
        letterSpacing: '-0.01em'
      }}>
        Habit Trends
      </h2>

      {/* Toggle buttons */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20
      }}>
        {habits.map((habit, index) => {
          const color = habitColors[index % habitColors.length];
          const visible = visibleHabits[habit.id];
          return (
            <button
              key={habit.id}
              onClick={() => onToggleHabit(habit.id)}
              style={{
                padding: '6px 12px',
                background: visible ? `${color}20` : 'transparent',
                border: `1px solid ${visible ? color : theme.border}`,
                borderRadius: 8,
                color: visible ? color : theme.textMuted,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: theme.fontFamily,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                opacity: visible ? 1 : 0.3
              }} />
              {habit.name}
            </button>
          );
        })}
      </div>

      {/* SVG Chart */}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={theme.border}
          strokeWidth={1}
        />

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map(pct => (
          <g key={pct}>
            <text
              x={padding.left - 10}
              y={yScale(pct) + 4}
              textAnchor="end"
              fill={theme.textMuted}
              fontSize={11}
              fontFamily={theme.fontFamily}
            >
              {pct}%
            </text>
            <line
              x1={padding.left}
              y1={yScale(pct)}
              x2={width - padding.right}
              y2={yScale(pct)}
              stroke={theme.border}
              strokeWidth={0.5}
              opacity={0.2}
            />
          </g>
        ))}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={theme.border}
          strokeWidth={1}
        />

        {/* X-axis labels */}
        {Array.from({ length: Math.ceil(daysInMonth / 5) }, (_, i) => i * 5 + 1).map(day => {
          if (day > daysInMonth) return null;
          return (
            <text
              key={day}
              x={xScale(day)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={11}
              fontFamily={theme.fontFamily}
            >
              {day}
            </text>
          );
        })}

        {/* Habit lines */}
        {habitData.map(({ habit, data }, index) => {
          if (!visibleHabits[habit.id]) return null;

          const color = habitColors[index % habitColors.length];
          const pathD = data.map((point, i) =>
            `${i === 0 ? 'M' : 'L'} ${xScale(point.day)} ${yScale(point.percentage)}`
          ).join(' ');

          return (
            <path
              key={habit.id}
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </div>
  );
};

// Monthly Summary
const MonthlySummary = ({ theme, config, habits, completions, days, year, month }) => {
  const daysInMonth = new Date(year, month, 0).getDate();

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

  const daysLogged = days.length;

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      padding: 24
    }}>
      <h2 style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: theme.fontFamily,
        color: theme.text,
        margin: 0,
        marginBottom: 16,
        letterSpacing: '-0.01em'
      }}>
        Monthly Summary
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
        fontFamily: theme.fontFamily
      }}>
        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
          border: '1px solid #10b981',
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#10b981',
            marginBottom: 8,
            fontFamily: theme.fontFamily
          }}>
            BUILD HABITS
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#10b981',
            fontFamily: theme.fontFamily
          }}>
            {buildPct}%
          </div>
          <div style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
            fontFamily: theme.fontFamily
          }}>
            {buildCompleted} of {buildTotal} completions
          </div>
        </div>

        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          border: '1px solid #ef4444',
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#ef4444',
            marginBottom: 8,
            fontFamily: theme.fontFamily
          }}>
            ELIMINATE HABITS
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#ef4444',
            fontFamily: theme.fontFamily
          }}>
            {eliminatePct}%
          </div>
          <div style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
            fontFamily: theme.fontFamily
          }}>
            {eliminateCompleted} of {eliminateTotal} avoided
          </div>
        </div>

        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${theme.border}`,
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: theme.textMuted,
            marginBottom: 8,
            fontFamily: theme.fontFamily
          }}>
            DAYS LOGGED
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: theme.text,
            fontFamily: theme.fontFamily
          }}>
            {daysLogged}
          </div>
          <div style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
            fontFamily: theme.fontFamily
          }}>
            out of {daysInMonth} days
          </div>
        </div>
      </div>
    </div>
  );
};
