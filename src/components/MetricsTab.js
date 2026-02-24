import React, { useState, useEffect, useMemo } from 'react';
import { loadMetrics, insertMetric, updateMetric, deleteMetric } from '../services/metricsService';
import { calculateProductivityMetricsRange } from '../services/productivityMetricsService';
import ICONS from '../constants/icons';

/**
 * Phase 3: Metrics Architecture
 * 3-tab metrics system: Dashboard, Log, Add Entry
 */
export const MetricsTab = ({ theme, config, accentColor, user, events = [] }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [calculating, setCalculating] = useState(false);

  // Load metrics on mount
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
      const { data, error } = await loadMetrics(
        user.uid,
        startDate.toISOString(),
        new Date().toISOString()
      );

      if (error) {
        console.error('Failed to load metrics:', error);
      }

      setMetrics(data || []);
      setLoading(false);
    };

    load();
  }, [user?.uid, refreshKey]);

  const handleCalculateProductivity = async () => {
    if (!user?.uid || events.length === 0) {
      alert('No events found to calculate productivity metrics');
      return;
    }

    setCalculating(true);

    try {
      // Calculate for last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { success, error } = await calculateProductivityMetricsRange(
        user.uid,
        startDate,
        endDate,
        events
      );

      if (success) {
        alert('Productivity metrics calculated successfully!');
        setRefreshKey(prev => prev + 1); // Refresh the metrics
      } else {
        console.error('Error calculating metrics:', error);
        alert('Failed to calculate productivity metrics');
      }
    } catch (error) {
      console.error('Error in handleCalculateProductivity:', error);
      alert('Failed to calculate productivity metrics');
    } finally {
      setCalculating(false);
    }
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
        color: theme.textSec
      }}>
        <ICONS.Lock width={48} height={48} style={{ opacity: 0.5 }} />
        <p style={{ fontSize: 14 }}>Sign in to track your metrics</p>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      width: '100%',
      padding: '16px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      overflow: 'hidden',
      fontFamily: theme.fontFamily
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: theme.fontDisplay,
            color: theme.text,
            marginBottom: 4,
            letterSpacing: '-0.03em',
            background: theme.metallicAccent || `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Metrics
          </h1>
          <p style={{
            fontSize: 13,
            color: theme.textSec,
            fontFamily: theme.fontFamily,
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}>
            Track health & productivity metrics
          </p>
        </div>
        <button
          onClick={handleCalculateProductivity}
          disabled={calculating}
          style={{
            padding: '10px 16px',
            background: calculating
              ? theme.border
              : `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
            border: `1.5px solid ${accentColor}`,
            borderRadius: 10,
            color: accentColor,
            fontSize: 12,
            fontWeight: 700,
            cursor: calculating ? 'not-allowed' : 'pointer',
            fontFamily: theme.fontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            letterSpacing: '0.01em'
          }}
        >
          <ICONS.Refresh width={14} height={14} />
          {calculating ? 'Calculating...' : 'Calculate Productivity'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: `1.5px solid ${theme.border}`,
        paddingBottom: 0,
        flexShrink: 0
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: ICONS.BarChart },
          { id: 'log', label: 'Log', icon: ICONS.List },
          { id: 'add', label: 'Add Entry', icon: ICONS.Plus }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2.5px solid ${accentColor}` : '2.5px solid transparent',
                color: isActive ? theme.text : theme.textMuted,
                fontSize: 12,
                fontWeight: isActive ? 700 : 600,
                fontFamily: theme.fontFamily,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                marginBottom: -1.5,
                letterSpacing: '0.01em'
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = theme.textMuted;
              }}
            >
              <Icon width={15} height={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content - Fixed height, no scroll */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        minHeight: 0
      }}>
        {loading ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
            fontSize: 13,
            fontFamily: theme.fontFamily,
            fontWeight: 600
          }}>
            Loading metrics...
          </div>
        ) : activeTab === 'dashboard' ? (
          <DashboardTab metrics={metrics} theme={theme} config={config} accentColor={accentColor} />
        ) : activeTab === 'log' ? (
          <LogTab
            metrics={metrics}
            theme={theme}
            config={config}
            accentColor={accentColor}
            onUpdate={async (id, updates) => {
              const { data } = await updateMetric(id, user?.uid, updates);
              if (data) {
                setMetrics(prev => prev.map(m => m.id === id ? data : m));
              }
            }}
            onDelete={async (id) => {
              const { error } = await deleteMetric(id, user?.uid);
              if (!error) {
                setMetrics(prev => prev.filter(m => m.id !== id));
              }
            }}
          />
        ) : (
          <AddEntryTab
            theme={theme}
            config={config}
            accentColor={accentColor}
            user={user}
            onSave={async (entry) => {
              const { data, error } = await insertMetric(entry);

              if (error) {
                console.error('Failed to save metric:', error);
                alert('Failed to save metric. Check console for details.');
                return false;
              }

              if (data) {
                // Add to local state
                setMetrics(prev => [data, ...prev]);
                // Switch to log tab to show the entry
                setActiveTab('log');
                // Trigger refresh
                setRefreshKey(prev => prev + 1);
                return true;
              }
              return false;
            }}
          />
        )}
      </div>
    </div>
  );
};

// Dashboard Tab - Shows charts and summary stats
const DashboardTab = ({ metrics, theme, config, accentColor }) => {
  const Suspense = React.Suspense;
  const lazy = React.lazy;

  const LineChartWidget = lazy(() =>
    import('../components/charts/LineChartWidget').then(module => ({
      default: module.LineChartWidget
    }))
  );

  const BarChartWidget = lazy(() =>
    import('../components/charts/BarChartWidget').then(module => ({
      default: module.BarChartWidget
    }))
  );

  // Organize metrics by type
  const sleepData = metrics
    .filter(m => m.metric_name === 'sleep_hours')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-30)
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.metric_value
    }));

  const moodData = metrics
    .filter(m => m.metric_name === 'mood')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-30)
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.metric_value
    }));

  const weightData = metrics
    .filter(m => m.metric_name === 'weight')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-30)
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.metric_value
    }));

  const productivityData = metrics
    .filter(m => m.metric_name === 'productivity_score')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-30)
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.metric_value
    }));

  const focusTimeData = metrics
    .filter(m => m.metric_name === 'focus_time')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-30)
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(m.metric_value / 60 * 10) / 10 // Convert to hours
    }));

  const workoutData = metrics
    .filter(m => m.metric_name === 'workout')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-14)
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.metric_data?.duration_minutes || m.metric_value,
      type: m.metric_data?.type || 'workout'
    }));

  // Calculate summary stats
  const avgSleep = sleepData.length > 0
    ? (sleepData.reduce((sum, d) => sum + d.value, 0) / sleepData.length).toFixed(1)
    : '—';

  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : '—';
  const displayWeightUnit = localStorage.getItem('weightUnit') || 'lbs';

  const avgProductivity = productivityData.length > 0
    ? Math.round(productivityData.reduce((sum, d) => sum + d.value, 0) / productivityData.length)
    : '—';

  const totalWorkouts = workoutData.length;

  if (metrics.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: theme.textMuted
      }}>
        <ICONS.BarChart width={48} height={48} style={{ opacity: 0.5 }} />
        <p style={{ fontSize: 14 }}>No metrics data yet</p>
        <p style={{ fontSize: 12, maxWidth: 400, textAlign: 'center' }}>
          Add some health metrics or calculate productivity metrics to see your dashboard
        </p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      paddingBottom: 40
    }}>
      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12
      }}>
        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          border: `1px solid ${theme.border}`,
          borderRadius: 12
        }}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, fontWeight: 600 }}>
            AVG SLEEP
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: accentColor,
            fontFamily: theme.fontDisplay
          }}>
            {avgSleep}{avgSleep !== '—' && <span style={{ fontSize: 16 }}> hrs</span>}
          </div>
        </div>

        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          border: `1px solid ${theme.border}`,
          borderRadius: 12
        }}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, fontWeight: 600 }}>
            CURRENT WEIGHT
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: accentColor,
            fontFamily: theme.fontDisplay
          }}>
            {latestWeight}{latestWeight !== '—' && <span style={{ fontSize: 16 }}> {displayWeightUnit}</span>}
          </div>
        </div>

        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          border: `1px solid ${theme.border}`,
          borderRadius: 12
        }}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, fontWeight: 600 }}>
            AVG PRODUCTIVITY
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: avgProductivity >= 70 ? '#10b981' : avgProductivity >= 50 ? '#f59e0b' : '#ef4444',
            fontFamily: theme.fontDisplay
          }}>
            {avgProductivity}{avgProductivity !== '—' && <span style={{ fontSize: 16 }}>/100</span>}
          </div>
        </div>

        <div style={{
          padding: 16,
          background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          border: `1px solid ${theme.border}`,
          borderRadius: 12
        }}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, fontWeight: 600 }}>
            WORKOUTS (14D)
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: totalWorkouts > 0 ? accentColor : theme.textMuted,
            fontFamily: theme.fontDisplay
          }}>
            {totalWorkouts}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 16,
        paddingBottom: 32
      }}>
        {/* Sleep Trend */}
        {sleepData.length > 0 && (
          <div style={{
            padding: '16px 16px 8px 16px',
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            overflow: 'visible'
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Sleep Trend (Last 30 Days)
            </h3>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <LineChartWidget
                data={sleepData}
                dataKey="value"
                xDataKey="date"
                theme={theme}
                height={180}
              />
            </Suspense>
          </div>
        )}

        {/* Weight Progress */}
        {weightData.length > 0 && (
          <div style={{
            padding: '16px 16px 8px 16px',
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            overflow: 'visible'
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Weight Trend (Last 30 Days)
            </h3>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <LineChartWidget
                data={weightData}
                dataKey="value"
                xDataKey="date"
                theme={theme}
                height={180}
              />
            </Suspense>
          </div>
        )}

        {/* Productivity Score */}
        {productivityData.length > 0 && (
          <div style={{
            padding: '16px 16px 8px 16px',
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            overflow: 'visible'
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Productivity Score (Last 30 Days)
            </h3>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <LineChartWidget
                data={productivityData}
                dataKey="value"
                xDataKey="date"
                theme={theme}
                height={180}
              />
            </Suspense>
          </div>
        )}

        {/* Focus Time */}
        {focusTimeData.length > 0 && (
          <div style={{
            padding: '16px 16px 8px 16px',
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            overflow: 'visible'
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Focus Time Hours (Last 30 Days)
            </h3>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <BarChartWidget
                data={focusTimeData}
                dataKey="value"
                xDataKey="date"
                theme={theme}
                height={180}
              />
            </Suspense>
          </div>
        )}

        {/* Workout Frequency */}
        {workoutData.length > 0 && (
          <div style={{
            padding: '16px 16px 8px 16px',
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            overflow: 'visible'
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Workout Duration (Last 14 Days)
            </h3>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <BarChartWidget
                data={workoutData}
                dataKey="value"
                xDataKey="date"
                theme={theme}
                height={180}
              />
            </Suspense>
          </div>
        )}

        {/* Mood Trend */}
        {moodData.length > 0 && (
          <div style={{
            padding: '16px 16px 8px 16px',
            background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            overflow: 'visible'
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Mood Trend (Last 30 Days)
            </h3>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <LineChartWidget
                data={moodData}
                dataKey="value"
                xDataKey="date"
                theme={theme}
                height={180}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};

// Log Tab - Lists all metrics entries grouped by category
const LogTab = ({ metrics, theme, config, accentColor, onUpdate, onDelete }) => {
  const [filterType, setFilterType] = useState('all');

  const groupedMetrics = useMemo(() => {
    const filtered = filterType === 'all' ? metrics : metrics.filter(m => m.metric_type === filterType);

    const groups = {
      sleep: filtered.filter(m => m.metric_name === 'sleep_hours'),
      mood: filtered.filter(m => m.metric_name === 'mood'),
      energy: filtered.filter(m => m.metric_name === 'energy'),
      weight: filtered.filter(m => m.metric_name === 'weight'),
      workout: filtered.filter(m => m.metric_name === 'workout'),
      eating: filtered.filter(m => m.metric_name === 'healthy_eating')
    };

    // Sort each group by date desc and limit to 5 most recent
    Object.keys(groups).forEach(key => {
      groups[key] = groups[key]
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
        .slice(0, 5); // Only show 5 most recent
    });

    return groups;
  }, [metrics, filterType]);

  if (metrics.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: theme.textMuted,
        fontFamily: theme.fontFamily
      }}>
        <ICONS.List width={48} height={48} style={{ opacity: 0.5 }} />
        <p style={{ fontSize: 14, fontWeight: 600, fontFamily: theme.fontFamily }}>No metrics yet</p>
        <p style={{ fontSize: 12, fontFamily: theme.fontFamily }}>Add your first entry to get started</p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      overflow: 'hidden',
      paddingTop: 4
    }}>
      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexShrink: 0,
        flexWrap: 'nowrap',
        alignItems: 'center',
        paddingTop: 2
      }}>
        {['all', 'manual', 'auto'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '10px 20px',
              background: filterType === type
                ? `${accentColor}15`
                : config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1.5px solid ${filterType === type ? accentColor : theme.border}`,
              borderRadius: 10,
              color: filterType === type ? accentColor : theme.text,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: theme.fontFamily,
              letterSpacing: '0.02em',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              minWidth: 90,
              flexShrink: 0
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Grouped Metrics List - 2 column grid, no scroll */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        alignContent: 'start'
      }}>
        {Object.entries({
          sleep: { label: 'Sleep', color: '#6366f1', format: (m) => `${m.metric_value}h` },
          mood: { label: 'Mood', color: '#f59e0b', format: (m) => `${m.metric_value}/5` },
          energy: { label: 'Energy', color: '#10b981', format: (m) => `${m.metric_value}/5` },
          weight: { label: 'Weight', color: '#ec4899', format: (m) => `${m.metric_value} ${m.metric_data?.unit || localStorage.getItem('weightUnit') || 'lbs'}` },
          workout: { label: 'Workout', color: '#8b5cf6', format: (m) => {
            const type = m.metric_data?.type || 'workout';
            const duration = m.metric_data?.duration_minutes || m.metric_value;
            return `${type} (${duration}m)`;
          }},
          eating: { label: 'Healthy Eating', color: '#14b8a6', format: () => '✓' }
        }).map(([key, categoryConfig]) => {
          const categoryMetrics = groupedMetrics[key];
          if (categoryMetrics.length === 0) return null;

          return (
            <div key={key} style={{
              background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '100%'
            }}>
              {/* Category Header */}
              <div style={{
                padding: '10px 14px',
                background: config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderBottom: `1px solid ${theme.border}`,
                flexShrink: 0
              }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: categoryConfig.color,
                  margin: 0,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: theme.fontFamily
                }}>
                  {categoryConfig.label}
                </h3>
              </div>

              {/* Entries - Compact List */}
              <div style={{
                padding: '6px 0',
                overflow: 'hidden'
              }}>
                {categoryMetrics.map((metric, idx) => (
                  <div
                    key={metric.id}
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderBottom: idx < categoryMetrics.length - 1 ? `1px solid ${theme.border}10` : 'none'
                    }}
                  >
                    <div style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <div style={{
                        fontSize: 10,
                        color: theme.textMuted,
                        fontFamily: theme.fontFamily,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {new Date(metric.recorded_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                        <span style={{
                          color: metric.metric_type === 'auto' ? '#10b981' : '#6366f1',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          fontSize: 9,
                          letterSpacing: '0.08em',
                          background: metric.metric_type === 'auto' ? '#10b98110' : '#6366f110',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}>
                          {metric.metric_type}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: categoryConfig.color,
                      fontFamily: theme.fontFamily,
                      flexShrink: 0,
                      letterSpacing: '-0.01em'
                    }}>
                      {categoryConfig.format(metric)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Add Entry Tab - Form to add new metrics
const AddEntryTab = ({ theme, config, accentColor, user, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Health metrics
  const [sleepHours, setSleepHours] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState(() => localStorage.getItem('weightUnit') || 'lbs');
  const [workoutType, setWorkoutType] = useState('');
  const [customWorkout, setCustomWorkout] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [healthyEating, setHealthyEating] = useState(false);
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if at least one field is filled
    const hasData = sleepHours || weight || workoutType || healthyEating || mood || energy;
    if (!hasData) {
      alert('Please fill in at least one metric');
      return;
    }

    setSaving(true);

    try {
      const entries = [];

      // Sleep entry
      if (sleepHours) {
        entries.push({
          user_id: user.uid,
          recorded_at: new Date(date).toISOString(),
          metric_type: 'manual',
          metric_name: 'sleep_hours',
          metric_value: parseFloat(sleepHours),
          metric_data: {}
        });
      }

      // Weight entry
      if (weight) {
        entries.push({
          user_id: user.uid,
          recorded_at: new Date(date).toISOString(),
          metric_type: 'manual',
          metric_name: 'weight',
          metric_value: parseFloat(weight),
          metric_data: { unit: weightUnit }
        });
      }

      // Workout entry
      if (workoutType) {
        const finalWorkoutType = workoutType === 'other' && customWorkout ? customWorkout : workoutType;
        entries.push({
          user_id: user.uid,
          recorded_at: new Date(date).toISOString(),
          metric_type: 'manual',
          metric_name: 'workout',
          metric_value: workoutDuration ? parseFloat(workoutDuration) : 0,
          metric_data: {
            type: finalWorkoutType,
            duration_minutes: workoutDuration ? parseFloat(workoutDuration) : 0
          }
        });
      }

      // Healthy eating entry
      if (healthyEating) {
        entries.push({
          user_id: user.uid,
          recorded_at: new Date(date).toISOString(),
          metric_type: 'manual',
          metric_name: 'healthy_eating',
          metric_value: 1,
          metric_data: {}
        });
      }

      // Mood entry
      if (mood) {
        entries.push({
          user_id: user.uid,
          recorded_at: new Date(date).toISOString(),
          metric_type: 'manual',
          metric_name: 'mood',
          metric_value: parseInt(mood),
          metric_data: {}
        });
      }

      // Energy entry
      if (energy) {
        entries.push({
          user_id: user.uid,
          recorded_at: new Date(date).toISOString(),
          metric_type: 'manual',
          metric_name: 'energy',
          metric_value: parseInt(energy),
          metric_data: {}
        });
      }

      // Save all entries
      let allSuccess = true;
      for (const entry of entries) {
        const success = await onSave(entry);
        if (!success) allSuccess = false;
      }

      if (allSuccess) {
        // Reset form
        setSleepHours('');
        setWeight('');
        setWorkoutType('');
        setCustomWorkout('');
        setWorkoutDuration('');
        setHealthyEating(false);
        setMood('');
        setEnergy('');
        setDate(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Failed to save metrics');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      overflow: 'hidden',
      padding: '8px 0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: theme.text,
              marginBottom: 4,
              fontFamily: theme.fontDisplay,
              letterSpacing: '-0.02em'
            }}>
              Add Health Metrics
            </h2>
            <p style={{
              fontSize: 12,
              color: theme.textMuted
            }}>
              Fill in one or more metrics for the day
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: saving
                ? theme.border
                : `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: theme.fontFamily,
              boxShadow: saving ? 'none' : `0 2px 8px ${accentColor}40`
            }}
          >
            {saving ? 'Saving...' : 'Save Metrics'}
          </button>
        </div>

        {/* Form Fields - 2 rows of 4 columns each */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {/* Date */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                letterSpacing: '0.02em'
              }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: theme.fontFamily
                }}
              />
            </div>

            {/* Sleep Hours */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                letterSpacing: '0.02em'
              }}>
                Sleep Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={sleepHours}
                onChange={e => setSleepHours(e.target.value)}
                placeholder="7.5"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: theme.fontFamily
                }}
              />
            </div>

            {/* Weight */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: accentColor,
                  letterSpacing: '0.02em'
                }}>
                  Weight
                </label>
                <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                  {['lbs', 'kg'].map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => { setWeightUnit(unit); localStorage.setItem('weightUnit', unit); }}
                      style={{
                        padding: '3px 8px',
                        fontSize: 9,
                        fontWeight: 600,
                        fontFamily: theme.fontFamily,
                        background: weightUnit === unit ? `${accentColor}20` : 'transparent',
                        color: weightUnit === unit ? accentColor : theme.textMuted,
                        border: 'none',
                        cursor: 'pointer',
                        borderRight: unit === 'lbs' ? `1px solid ${theme.border}` : 'none'
                      }}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder={weightUnit === 'kg' ? '75.0' : '165.5'}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: theme.fontFamily
                }}
              />
            </div>

            {/* Mood */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                letterSpacing: '0.02em'
              }}>
                Mood
              </label>
              <select
                value={mood}
                onChange={e => setMood(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: theme.fontFamily
                }}
              >
                <option value="">—</option>
                <option value="1">1 Bad</option>
                <option value="2">2 Low</option>
                <option value="3">3 Okay</option>
                <option value="4">4 Good</option>
                <option value="5">5 Great</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {/* Workout Type */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                letterSpacing: '0.02em'
              }}>
                Workout
              </label>
              <select
                value={workoutType}
                onChange={e => { setWorkoutType(e.target.value); if (e.target.value !== 'other') setCustomWorkout(''); }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: theme.fontFamily
                }}
              >
                <option value="">None</option>
                <option value="cardio">Cardio</option>
                <option value="strength">Strength</option>
                <option value="yoga">Yoga</option>
                <option value="sports">Sports</option>
                <option value="walk">Walk</option>
                <option value="other">Other...</option>
              </select>
            </div>

            {/* Custom Workout or Duration */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                letterSpacing: '0.02em'
              }}>
                {workoutType === 'other' ? 'Workout Name' : 'Duration (min)'}
              </label>
              {workoutType === 'other' ? (
                <input
                  type="text"
                  value={customWorkout}
                  onChange={e => setCustomWorkout(e.target.value)}
                  placeholder="e.g. Swimming"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 10,
                    color: theme.text,
                    fontSize: 13,
                    fontFamily: theme.fontFamily
                  }}
                />
              ) : (
                <input
                  type="number"
                  step="5"
                  min="0"
                  value={workoutDuration}
                  onChange={e => setWorkoutDuration(e.target.value)}
                  placeholder="30"
                  disabled={!workoutType}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 10,
                    color: theme.text,
                    fontSize: 13,
                    fontFamily: theme.fontFamily,
                    opacity: workoutType ? 1 : 0.5
                  }}
                />
              )}
            </div>

            {/* Duration (shown when custom workout selected) or Energy */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                letterSpacing: '0.02em'
              }}>
                {workoutType === 'other' ? 'Duration (min)' : 'Energy'}
              </label>
              {workoutType === 'other' ? (
                <input
                  type="number"
                  step="5"
                  min="0"
                  value={workoutDuration}
                  onChange={e => setWorkoutDuration(e.target.value)}
                  placeholder="30"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 10,
                    color: theme.text,
                    fontSize: 13,
                    fontFamily: theme.fontFamily
                  }}
                />
              ) : (
                <select
                  value={energy}
                  onChange={e => setEnergy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 10,
                    color: theme.text,
                    fontSize: 13,
                    fontFamily: theme.fontFamily
                  }}
                >
                  <option value="">—</option>
                  <option value="1">1 Drained</option>
                  <option value="2">2 Low</option>
                  <option value="3">3 Okay</option>
                  <option value="4">4 High</option>
                  <option value="5">5 Energized</option>
                </select>
              )}
            </div>

            {/* Ate Healthy or Energy (when other workout) */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              {workoutType === 'other' ? (
                <div style={{ width: '100%' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: accentColor,
                    marginBottom: 6,
                    letterSpacing: '0.02em'
                  }}>
                    Energy
                  </label>
                  <select
                    value={energy}
                    onChange={e => setEnergy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      color: theme.text,
                      fontSize: 13,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    <option value="">—</option>
                    <option value="1">1 Drained</option>
                    <option value="2">2 Low</option>
                    <option value="3">3 Okay</option>
                    <option value="4">4 High</option>
                    <option value="5">5 Energized</option>
                  </select>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: theme.text,
                  padding: '12px 14px',
                  background: healthyEating ? `${accentColor}12` : (config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${healthyEating ? accentColor : theme.border}`,
                  borderRadius: 10,
                  width: '100%',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={healthyEating}
                    onChange={e => setHealthyEating(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      accentColor: accentColor
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>Ate healthy</span>
                </label>
              )}
            </div>
          </div>

          {/* Row 3 - Only shows when custom workout is selected */}
          {workoutType === 'other' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: theme.text,
                  padding: '12px 14px',
                  background: healthyEating ? `${accentColor}12` : (config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${healthyEating ? accentColor : theme.border}`,
                  borderRadius: 10,
                  width: '100%',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={healthyEating}
                    onChange={e => setHealthyEating(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      accentColor: accentColor
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>Ate healthy</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
