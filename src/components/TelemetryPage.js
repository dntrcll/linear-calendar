import React, { useState, useEffect } from 'react';
import {
  loadMonthTelemetry,
  toggleHabitCompletion,
  updateDayTelemetry,
  updateMonthSummary,
  createHabit
} from '../services/telemetryService';
import ICONS from '../constants/icons';

/**
 * Telemetry Page - Personal telemetry dashboard
 * Translates analog notebook habit tracking into digital form
 * No gamification - just observation and self-knowledge
 */
export const TelemetryPage = ({ theme, config, accentColor, user }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const [habits, setHabits] = useState([]);
  const [days, setDays] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Load telemetry data for current month
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
      setSummary(result.summary);
      setLoading(false);
    };

    loadData();
  }, [user?.uid, currentYear, currentMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format month name
  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  if (!user) {
    return (
      <div style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: theme.textSec
      }}>
        <ICONS.Lock width={48} height={48} style={{ opacity: 0.5 }} />
        <p style={{ fontSize: 14 }}>Sign in to view your telemetry</p>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      maxWidth: 1400,
      margin: '0 auto',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      overflow: 'auto'
    }}>
      {/* Header with Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: theme.fontDisplay,
          color: theme.text,
          letterSpacing: '-0.03em'
        }}>
          Telemetry
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <button
            onClick={goToPreviousMonth}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ICONS.ChevronLeft width={20} height={20} />
          </button>

          <span style={{
            fontSize: 16,
            fontWeight: 600,
            color: theme.text,
            minWidth: 180,
            textAlign: 'center'
          }}>
            {monthName}
          </span>

          <button
            onClick={goToNextMonth}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ICONS.ChevronRight width={20} height={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.textMuted,
          fontSize: 14
        }}>
          Loading telemetry...
        </div>
      ) : (
        <>
          {/* Two-column layout: Memorable Moments + Habit Matrix */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 20
          }}>
            <MemorableMomentsSection
              theme={theme}
              config={config}
              summary={summary}
              user={user}
              year={currentYear}
              month={currentMonth}
              onUpdate={(text) => {
                updateMonthSummary(user.uid, currentYear, currentMonth, text);
              }}
            />

            <HabitMatrixSection
              theme={theme}
              config={config}
              accentColor={accentColor}
              habits={habits}
              completions={completions}
              year={currentYear}
              month={currentMonth}
              user={user}
              onToggle={async (date, habitId, completed) => {
                await toggleHabitCompletion(user.uid, date, habitId, completed);
                // Reload data
                const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
                setCompletions(result.completions);
              }}
              onDayClick={(dayNum) => {
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                setSelectedDay({ date: dateStr, dayNum });
                setShowDayModal(true);
              }}
              onAddHabit={async (name) => {
                const maxOrder = Math.max(...habits.map(h => h.display_order), 0);
                await createHabit(user.uid, name, maxOrder + 1);
                const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
                setHabits(result.habits);
              }}
            />
          </div>

          {/* Mood/Energy Trend Chart */}
          <MoodTrendSection
            theme={theme}
            config={config}
            accentColor={accentColor}
            days={days}
            year={currentYear}
            month={currentMonth}
            onPointClick={(dayNum) => {
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              setSelectedDay({ date: dateStr, dayNum });
              setShowDayModal(true);
            }}
          />

          {/* Monthly Summary Stats */}
          <MonthlySummarySection
            theme={theme}
            config={config}
            days={days}
            completions={completions}
            habits={habits}
            year={currentYear}
            month={currentMonth}
          />
        </>
      )}

      {/* Daily Detail Modal */}
      {showDayModal && selectedDay && (
        <DailyDetailModal
          theme={theme}
          config={config}
          accentColor={accentColor}
          user={user}
          date={selectedDay.date}
          dayNum={selectedDay.dayNum}
          habits={habits}
          days={days}
          completions={completions}
          onClose={() => setShowDayModal(false)}
          onSave={async () => {
            // Reload data after save
            const result = await loadMonthTelemetry(user.uid, currentYear, currentMonth);
            setDays(result.days);
            setCompletions(result.completions);
            setShowDayModal(false);
          }}
        />
      )}
    </div>
  );
};

// Memorable Moments Section - monthly narrative
const MemorableMomentsSection = ({ theme, config, summary, user, year, month, onUpdate }) => {
  const [text, setText] = useState(summary?.memorable_moments || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(summary?.memorable_moments || '');
  }, [summary]);

  const handleBlur = async () => {
    if (text === (summary?.memorable_moments || '')) return;

    setIsSaving(true);
    await onUpdate(text);
    setIsSaving(false);
  };

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Memorable Moments
        </h3>
        {isSaving && (
          <span style={{ fontSize: 11, color: theme.textMuted }}>Saving...</span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="What made this month memorable?"
        style={{
          width: '100%',
          minHeight: 300,
          padding: 12,
          background: config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          color: theme.text,
          fontSize: 13,
          fontFamily: theme.fontFamily,
          lineHeight: 1.6,
          resize: 'vertical'
        }}
      />
    </div>
  );
};

// Habit Matrix Section - the grid of X marks
const HabitMatrixSection = ({
  theme,
  config,
  accentColor,
  habits,
  completions,
  year,
  month,
  user,
  onToggle,
  onDayClick,
  onAddHabit
}) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  // Get completion status for a specific day and habit
  const isCompleted = (dayNum, habitId) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const completion = completions.find(c => c.date === dateStr && c.habit_id === habitId);
    return completion?.completed || false;
  };

  const handleToggle = async (dayNum, habitId) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const currentStatus = isCompleted(dayNum, habitId);
    await onToggle(dateStr, habitId, !currentStatus);
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName.trim());
    setNewHabitName('');
    setShowAddHabit(false);
  };

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Habit Matrix
        </h3>
        <button
          onClick={() => setShowAddHabit(!showAddHabit)}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: `1px solid ${accentColor}`,
            borderRadius: 6,
            color: accentColor,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <ICONS.Plus width={12} height={12} />
          Add Habit
        </button>
      </div>

      {showAddHabit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
              fontSize: 12,
              fontFamily: theme.fontFamily
            }}
          />
          <button
            onClick={handleAddHabit}
            style={{
              padding: '8px 16px',
              background: accentColor,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: theme.textMuted,
          fontSize: 13
        }}>
          <p>No habits yet. Add your first habit to start tracking.</p>
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0
          }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky',
                  left: 0,
                  background: config.darkMode ? '#0F172A' : '#fff',
                  padding: '8px',
                  borderBottom: `1px solid ${theme.border}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.textMuted,
                  textAlign: 'left',
                  zIndex: 2
                }}>
                  Day
                </th>
                {habits.map(habit => (
                  <th key={habit.id} style={{
                    padding: '8px 4px',
                    borderBottom: `1px solid ${theme.border}`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.text,
                    textAlign: 'center',
                    minWidth: 60,
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {habit.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dayNum => (
                <tr key={dayNum}>
                  <td style={{
                    position: 'sticky',
                    left: 0,
                    background: config.darkMode ? '#0F172A' : '#fff',
                    padding: '6px 8px',
                    borderBottom: `1px solid ${theme.border}20`,
                    fontSize: 12,
                    fontWeight: 500,
                    color: theme.textSec,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                  onClick={() => onDayClick(dayNum)}
                  >
                    {dayNum}
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
                        fontSize: 14,
                        fontWeight: 600,
                        color: theme.textMuted,
                        userSelect: 'none'
                      }}
                    >
                      {isCompleted(dayNum, habit.id) ? '×' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Mood Trend Section - line chart
const MoodTrendSection = ({ theme, config, accentColor, days, year, month, onPointClick }) => {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build data array for all days of month
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = days.find(d => d.date === dateStr);
    return {
      day: dayNum,
      score: dayData?.mood_score || null
    };
  });

  // SVG dimensions
  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (day) => padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth;
  const yScale = (score) => padding.top + chartHeight - (score / 10) * chartHeight;

  // Generate line path
  let pathSegments = [];
  let currentSegment = [];

  chartData.forEach((d, i) => {
    if (d.score !== null) {
      currentSegment.push({ x: xScale(d.day), y: yScale(d.score), day: d.day, score: d.score });
    } else {
      if (currentSegment.length > 0) {
        pathSegments.push(currentSegment);
        currentSegment = [];
      }
    }
  });
  if (currentSegment.length > 0) {
    pathSegments.push(currentSegment);
  }

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 20
    }}>
      <h3 style={{
        fontSize: 14,
        fontWeight: 600,
        color: theme.text,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 20
      }}>
        Mood / Energy Trend
      </h3>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
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
        {[0, 2, 4, 6, 8, 10].map(score => (
          <g key={score}>
            <line
              x1={padding.left - 5}
              y1={yScale(score)}
              x2={padding.left}
              y2={yScale(score)}
              stroke={theme.border}
              strokeWidth={1}
            />
            <text
              x={padding.left - 10}
              y={yScale(score) + 4}
              textAnchor="end"
              fill={theme.textMuted}
              fontSize={11}
            >
              {score}
            </text>
            <line
              x1={padding.left}
              y1={yScale(score)}
              x2={width - padding.right}
              y2={yScale(score)}
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

        {/* X-axis labels (show every 5 days) */}
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
            >
              {day}
            </text>
          );
        })}

        {/* Line segments */}
        {pathSegments.map((segment, segIndex) => {
          if (segment.length < 2) return null;
          const pathD = segment.map((point, i) =>
            `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
          ).join(' ');

          return (
            <path
              key={segIndex}
              d={pathD}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Data points */}
        {chartData.filter(d => d.score !== null).map(d => (
          <circle
            key={d.day}
            cx={xScale(d.day)}
            cy={yScale(d.score)}
            r={4}
            fill={accentColor}
            stroke={config.darkMode ? '#0F172A' : '#fff'}
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onClick={() => onPointClick(d.day)}
          />
        ))}
      </svg>
    </div>
  );
};

// Monthly Summary Section - calculated stats
const MonthlySummarySection = ({ theme, config, days, completions, habits, year, month }) => {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Calculate average mood
  const moodScores = days.filter(d => d.mood_score !== null).map(d => d.mood_score);
  const avgMood = moodScores.length > 0
    ? (moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length).toFixed(1)
    : null;

  // Calculate habit density
  const totalPossible = daysInMonth * habits.length;
  const totalCompleted = completions.filter(c => c.completed).length;
  const habitDensity = totalPossible > 0
    ? Math.round((totalCompleted / totalPossible) * 100)
    : 0;

  // Days with data logged
  const daysLogged = days.length;

  return (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 20
    }}>
      <h3 style={{
        fontSize: 14,
        fontWeight: 600,
        color: theme.text,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 16
      }}>
        Monthly Summary
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 13,
        color: theme.textSec
      }}>
        <div>
          • Avg mood: {avgMood !== null ? `${avgMood} / 10` : 'No data'}
        </div>
        <div>
          • Habit density: {habitDensity}% ({totalCompleted} of {totalPossible} possible)
        </div>
        <div>
          • Days logged: {daysLogged} / {daysInMonth}
        </div>
      </div>
    </div>
  );
};

// Daily Detail Modal - edit a specific day
const DailyDetailModal = ({
  theme,
  config,
  accentColor,
  user,
  date,
  dayNum,
  habits,
  days,
  completions,
  onClose,
  onSave
}) => {
  const dayData = days.find(d => d.date === date);
  const [moodScore, setMoodScore] = useState(dayData?.mood_score || 5);
  const [note, setNote] = useState(dayData?.note || '');
  const [habitStates, setHabitStates] = useState(() => {
    const states = {};
    habits.forEach(habit => {
      const completion = completions.find(c => c.date === date && c.habit_id === habit.id);
      states[habit.id] = completion?.completed || false;
    });
    return states;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // Save mood and note
    await updateDayTelemetry(user.uid, date, moodScore, note);

    // Save habit completions
    for (const habitId of Object.keys(habitStates)) {
      await toggleHabitCompletion(user.uid, date, habitId, habitStates[habitId]);
    }

    setSaving(false);
    onSave();
  };

  const monthName = new Date(date).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: config.darkMode ? '#1E293B' : '#fff',
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: theme.text
          }}>
            {monthName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              padding: 4
            }}
          >
            <ICONS.Close width={20} height={20} />
          </button>
        </div>

        {/* Mood Score Slider */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: theme.textSec,
            marginBottom: 12
          }}>
            Mood / Energy
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <input
              type="range"
              min="0"
              max="10"
              value={moodScore}
              onChange={(e) => setMoodScore(parseInt(e.target.value))}
              style={{
                flex: 1,
                accentColor: accentColor
              }}
            />
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: accentColor,
              fontFamily: theme.fontDisplay,
              minWidth: 60,
              textAlign: 'right'
            }}>
              {moodScore} / 10
            </span>
          </div>
        </div>

        {/* Habits */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: theme.textSec,
            marginBottom: 12
          }}>
            Habits
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {habits.map(habit => (
              <label
                key={habit.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: theme.text
                }}
              >
                <input
                  type="checkbox"
                  checked={habitStates[habit.id] || false}
                  onChange={(e) => {
                    setHabitStates({
                      ...habitStates,
                      [habit.id]: e.target.checked
                    });
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: 'pointer'
                  }}
                />
                <span>{habit.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Daily Note */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: theme.textSec,
            marginBottom: 8
          }}>
            Daily Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any notes for this day..."
            style={{
              width: '100%',
              minHeight: 100,
              padding: 12,
              background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              fontSize: 13,
              fontFamily: theme.fontFamily,
              resize: 'vertical'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: saving ? theme.border : `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
