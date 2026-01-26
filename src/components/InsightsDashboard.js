import { Suspense, useMemo } from 'react';
import { LineChartWidget, BarChartWidget, AreaChartWidget } from './charts';
import {
  calculateProductivityScore,
  calculateFocusTime,
  calculateContextSwitches,
  calculateGoalCompletionRate
} from '../utils/metricsCalculations';
import ICONS from '../constants/icons';

/**
 * Dense 2-column insights dashboard
 */
export const InsightsDashboard = ({ events, goals, tags, theme, config, accentColor, onClose }) => {
  // Calculate today's metrics
  const todayMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= today && eventDate < tomorrow;
    });

    const todayGoals = goals?.filter(g => {
      const goalDate = new Date(g.date || g.created_at);
      return goalDate >= today && goalDate < tomorrow;
    }) || [];

    // Calculate total hours tracked
    const totalMinutes = todayEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const hoursTracked = (totalMinutes / 60).toFixed(1);

    // Goals completed
    const goalsCompleted = todayGoals.filter(g => g.completed || g.done).length;
    const totalGoals = todayGoals.length;

    // Active vs idle (assuming events are active)
    const activeMinutes = totalMinutes;
    const activeHours = (activeMinutes / 60).toFixed(1);

    // Focus sessions
    const focusCategories = ['work', 'deep-work', 'coding', 'learning'];
    const focusSessions = todayEvents.filter(e =>
      focusCategories.includes(e.category?.toLowerCase())
    ).length;

    // Longest focus session
    const focusEvents = todayEvents.filter(e =>
      focusCategories.includes(e.category?.toLowerCase())
    );
    const longestFocus = focusEvents.length > 0
      ? Math.max(...focusEvents.map(e => e.duration || 0))
      : 0;

    // Current streak (simplified - days with at least 1 event)
    let streak = 0;
    let checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);

      const hasEvents = events.some(e => {
        const eventDate = new Date(e.start);
        return eventDate >= dayStart && eventDate <= dayEnd;
      });

      if (hasEvents) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      hoursTracked,
      goalsCompleted,
      totalGoals,
      activeHours,
      focusSessions,
      longestFocus: (longestFocus / 60).toFixed(1),
      streak
    };
  }, [events, goals]);

  // Calculate weekly data for charts
  const weeklyData = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= date && eventDate < nextDay;
      });

      const totalMinutes = dayEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
      const hours = totalMinutes / 60;

      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: parseFloat(hours.toFixed(1)),
        events: dayEvents.length
      });
    }

    return days;
  }, [events]);

  // Category breakdown for time by category chart
  const categoryData = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const categoryTotals = {};
    events.forEach(e => {
      const eventDate = new Date(e.start);
      if (eventDate >= weekAgo && e.category) {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.duration || 0);
      }
    });

    return Object.entries(categoryTotals)
      .map(([category, minutes]) => {
        const tag = tags.find(t => t.tagId === category);
        return {
          name: tag?.name || category,
          hours: parseFloat((minutes / 60).toFixed(1)),
          color: tag?.color || accentColor
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);
  }, [events, tags, accentColor]);

  // Context split (Personal vs Work)
  const contextSplit = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let personalMinutes = 0;
    let workMinutes = 0;

    events.forEach(e => {
      const eventDate = new Date(e.start);
      if (eventDate >= weekAgo) {
        const context = e.context?.toLowerCase() || 'personal';
        if (context === 'work' || context === 'professional') {
          workMinutes += e.duration || 0;
        } else {
          personalMinutes += e.duration || 0;
        }
      }
    });

    const total = personalMinutes + workMinutes;
    return {
      personal: total > 0 ? Math.round((personalMinutes / total) * 100) : 50,
      work: total > 0 ? Math.round((workMinutes / total) * 100) : 50
    };
  }, [events]);

  // Productivity score
  const productivityData = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentEvents = events.filter(e => new Date(e.start) >= weekAgo);
    const recentGoals = goals?.filter(g => {
      const goalDate = new Date(g.date || g.created_at);
      return goalDate >= weekAgo;
    }) || [];

    const focusTime = calculateFocusTime(recentEvents);
    const totalTracked = recentEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const goalRate = calculateGoalCompletionRate(recentGoals);
    const switches = calculateContextSwitches(recentEvents.sort((a, b) =>
      new Date(a.start) - new Date(b.start)
    ));

    const score = calculateProductivityScore({
      focusTimeMinutes: focusTime,
      totalTrackedMinutes: totalTracked,
      goalCompletionRate: goalRate,
      contextSwitches: switches
    });

    return { score, trend: score >= 70 ? 'up' : score >= 40 ? 'stable' : 'down' };
  }, [events, goals]);

  // Best day this week
  const bestDay = useMemo(() => {
    const dayTotals = weeklyData.map(d => ({ day: d.date, hours: d.hours }));
    const best = dayTotals.reduce((max, d) => d.hours > max.hours ? d : max, { day: 'N/A', hours: 0 });
    return best.day;
  }, [weeklyData]);

  // Most used category
  const mostUsedCategory = useMemo(() => {
    if (categoryData.length === 0) return 'N/A';
    return categoryData[0].name;
  }, [categoryData]);

  // Average daily hours this week
  const avgDailyHours = useMemo(() => {
    const total = weeklyData.reduce((sum, d) => sum + d.hours, 0);
    return (total / 7).toFixed(1);
  }, [weeklyData]);

  const StatCard = ({ label, value, sublabel, color }) => (
    <div style={{
      padding: '14px 16px',
      borderRadius: 10,
      background: config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: theme.textMuted,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: color || theme.text,
        fontFamily: theme.fontDisplay,
        lineHeight: 1
      }}>
        {value}
      </div>
      {sublabel && (
        <div style={{
          fontSize: 11,
          color: theme.textSec,
          marginTop: 4
        }}>
          {sublabel}
        </div>
      )}
    </div>
  );

  const ChartCard = ({ title, icon, children, height = 200 }) => (
    <div style={{
      background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 16,
      height: height + 60
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
      }}>
        {icon}
        <h3 style={{
          fontSize: 13,
          fontWeight: 600,
          color: theme.text,
          fontFamily: theme.fontFamily
        }}>
          {title}
        </h3>
      </div>
      <div style={{ height }}>
        {children}
      </div>
    </div>
  );

  const getProductivityColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="scale-enter" style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: config.darkMode ? "rgba(0,0,0,0.7)" : "rgba(15,23,42,0.3)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="scroll-container" style={{
        width: '90vw',
        maxWidth: 1400,
        maxHeight: "92vh",
        overflow: "auto",
        background: theme.premiumGlass || theme.liquidGlass,
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: 20,
        border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
        boxShadow: theme.premiumShadow || (config.darkMode
          ? '0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)')
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 16px ${accentColor}40`
            }}>
              <ICONS.BarChart width={24} height={24} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: 24, fontWeight: 700, fontFamily: theme.fontDisplay,
                color: theme.text, marginBottom: 4, letterSpacing: '-0.03em'
              }}>
                Insights Dashboard
              </h2>
              <p style={{
                fontSize: 12, color: theme.textSec, fontFamily: theme.fontFamily, fontWeight: 500
              }}>
                Your productivity analytics at a glance
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            background: config.darkMode ? theme.hoverBg : '#F3F4F6',
            border: `1px solid ${theme.border}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: theme.textMuted, transition: 'all 0.2s'
          }}>
            <ICONS.Close width={16} height={16} />
          </button>
        </div>

        {/* Dashboard Content */}
        <div style={{ padding: 28 }}>
          {/* Today's Overview - Full Width */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 24
          }}>
            <StatCard
              label="Hours Tracked"
              value={todayMetrics.hoursTracked}
              sublabel="today"
              color={accentColor}
            />
            <StatCard
              label="Goals"
              value={`${todayMetrics.goalsCompleted}/${todayMetrics.totalGoals}`}
              sublabel={`${todayMetrics.totalGoals > 0 ? Math.round((todayMetrics.goalsCompleted/todayMetrics.totalGoals)*100) : 0}% complete`}
              color="#10b981"
            />
            <StatCard
              label="Active Time"
              value={`${todayMetrics.activeHours}h`}
              sublabel="focused work"
            />
            <StatCard
              label="Focus Sessions"
              value={todayMetrics.focusSessions}
              sublabel={`longest: ${todayMetrics.longestFocus}h`}
            />
            <StatCard
              label="Current Streak"
              value={`${todayMetrics.streak}d`}
              sublabel="days active"
              color="#f59e0b"
            />
            <StatCard
              label="Productivity"
              value={productivityData.score}
              sublabel={productivityData.trend === 'up' ? '↑ trending up' : productivityData.trend === 'down' ? '↓ needs work' : '→ stable'}
              color={getProductivityColor(productivityData.score)}
            />
          </div>

          {/* 2-Column Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16
          }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Weekly Time Chart */}
              <ChartCard
                title="Weekly Time Trend"
                icon={<ICONS.TrendingUp width={16} height={16} style={{ color: accentColor }} />}
                height={180}
              >
                <Suspense fallback={<div style={{
                  height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme.textMuted, fontSize: 12
                }}>Loading chart...</div>}>
                  <AreaChartWidget
                    data={weeklyData}
                    dataKey="hours"
                    xDataKey="date"
                    theme={theme}
                    height={180}
                  />
                </Suspense>
              </ChartCard>

              {/* Category Breakdown */}
              <ChartCard
                title="Time by Category"
                icon={<ICONS.Tag width={16} height={16} style={{ color: accentColor }} />}
                height={200}
              >
                <Suspense fallback={<div style={{
                  height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme.textMuted, fontSize: 12
                }}>Loading chart...</div>}>
                  <BarChartWidget
                    data={categoryData}
                    dataKey="hours"
                    xDataKey="name"
                    theme={theme}
                    height={200}
                  />
                </Suspense>
              </ChartCard>

              {/* Quick Stats */}
              <div style={{
                background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{
                  fontSize: 13, fontWeight: 600, color: theme.text,
                  marginBottom: 12, fontFamily: theme.fontFamily
                }}>
                  Week Summary
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: theme.textSec }}>Best Day</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{bestDay}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: theme.textSec }}>Most Used</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{mostUsedCategory}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: theme.textSec }}>Daily Average</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{avgDailyHours}h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Productivity Curve */}
              <ChartCard
                title="Productivity Trend"
                icon={<ICONS.Activity width={16} height={16} style={{ color: accentColor }} />}
                height={180}
              >
                <Suspense fallback={<div style={{
                  height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme.textMuted, fontSize: 12
                }}>Loading chart...</div>}>
                  <LineChartWidget
                    data={weeklyData}
                    dataKey="events"
                    xDataKey="date"
                    theme={theme}
                    height={180}
                  />
                </Suspense>
              </ChartCard>

              {/* Context Split */}
              <div style={{
                background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ICONS.Briefcase width={16} height={16} style={{ color: accentColor }} />
                  <h3 style={{
                    fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: theme.fontFamily
                  }}>
                    Context Split
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    flex: contextSplit.personal,
                    height: 12,
                    background: '#6366f1',
                    borderRadius: 6,
                    transition: 'flex 0.3s'
                  }} />
                  <div style={{
                    flex: contextSplit.work,
                    height: 12,
                    background: '#10b981',
                    borderRadius: 6,
                    transition: 'flex 0.3s'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1' }} />
                    <span style={{ color: theme.textSec }}>Personal</span>
                    <span style={{ fontWeight: 600, color: theme.text }}>{contextSplit.personal}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} />
                    <span style={{ color: theme.textSec }}>Work</span>
                    <span style={{ fontWeight: 600, color: theme.text }}>{contextSplit.work}%</span>
                  </div>
                </div>
              </div>

              {/* Category List */}
              <div style={{
                background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 16,
                flex: 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ICONS.List width={16} height={16} style={{ color: accentColor }} />
                  <h3 style={{
                    fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: theme.fontFamily
                  }}>
                    Top Categories
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {categoryData.slice(0, 5).map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: 3,
                        background: cat.color
                      }} />
                      <span style={{ flex: 1, fontSize: 12, color: theme.text }}>{cat.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted }}>{cat.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
