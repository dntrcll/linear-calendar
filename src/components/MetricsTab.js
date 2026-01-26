import { useState, useEffect, useMemo } from 'react';
import { loadMetrics, insertMetric, updateMetric, deleteMetric } from '../services/metricsService';
import ICONS from '../constants/icons';

/**
 * Phase 3: Metrics Architecture
 * 3-tab metrics system: Dashboard, Log, Add Entry
 */
export const MetricsTab = ({ theme, config, accentColor, user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
      maxWidth: 1400,
      margin: '0 auto',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: theme.fontDisplay,
          color: theme.text,
          marginBottom: 4,
          letterSpacing: '-0.03em',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Metrics
        </h1>
        <p style={{
          fontSize: 12,
          color: theme.textSec,
          fontFamily: theme.fontFamily,
          fontWeight: 500
        }}>
          Track health & productivity metrics
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: `1px solid ${theme.border}`,
        paddingBottom: 0
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
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                color: isActive ? theme.text : theme.textMuted,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: theme.fontFamily,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                marginBottom: -1
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = theme.textMuted;
              }}
            >
              <Icon width={16} height={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
            fontSize: 13
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
              const { data } = await updateMetric(id, updates);
              if (data) {
                setMetrics(prev => prev.map(m => m.id === id ? data : m));
              }
            }}
            onDelete={async (id) => {
              const { error } = await deleteMetric(id);
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
      <p style={{ fontSize: 14 }}>Dashboard coming in Phase 5</p>
      <p style={{ fontSize: 12, maxWidth: 400, textAlign: 'center' }}>
        Charts and visualizations will be added after we implement the core metrics features
      </p>
    </div>
  );
};

// Log Tab - Lists all metrics entries
const LogTab = ({ metrics, theme, config, accentColor, onUpdate, onDelete }) => {
  const [filterType, setFilterType] = useState('all');
  const [editingId, setEditingId] = useState(null);

  const filteredMetrics = useMemo(() => {
    if (filterType === 'all') return metrics;
    return metrics.filter(m => m.metric_type === filterType);
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
        color: theme.textMuted
      }}>
        <ICONS.List width={48} height={48} style={{ opacity: 0.5 }} />
        <p style={{ fontSize: 14 }}>No metrics yet</p>
        <p style={{ fontSize: 12 }}>Add your first entry to get started</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['all', 'manual', 'auto'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '8px 16px',
              background: filterType === type
                ? `${accentColor}15`
                : config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${filterType === type ? accentColor : theme.border}`,
              borderRadius: 8,
              color: filterType === type ? accentColor : theme.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Metrics List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredMetrics.map(metric => (
            <div
              key={metric.id}
              style={{
                padding: 16,
                background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 4
                }}>
                  {metric.metric_name || 'Unnamed metric'}
                </div>
                <div style={{
                  fontSize: 11,
                  color: theme.textMuted
                }}>
                  {new Date(metric.recorded_at).toLocaleDateString()} •{' '}
                  <span style={{
                    color: metric.metric_type === 'auto' ? '#10b981' : '#6366f1',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: 10
                  }}>
                    {metric.metric_type}
                  </span>
                </div>
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: accentColor,
                fontFamily: theme.fontDisplay
              }}>
                {metric.metric_value !== null && metric.metric_value !== undefined
                  ? metric.metric_value
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Add Entry Tab - Form to add new metrics
const AddEntryTab = ({ theme, config, accentColor, user, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!metricName.trim() || !metricValue) {
      alert('Please fill in both metric name and value');
      return;
    }

    setSaving(true);

    try {
      const entry = {
        user_id: user.uid,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'manual',
        metric_name: metricName.trim(),
        metric_value: parseFloat(metricValue),
        metric_data: {}
      };

      console.log('Submitting metric:', entry);

      const success = await onSave(entry);

      if (success) {
        // Reset form
        setMetricName('');
        setMetricValue('');
        setDate(new Date().toISOString().split('T')[0]);
        console.log('Metric saved successfully!');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: 500,
        background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 28
      }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 20,
          fontFamily: theme.fontDisplay
        }}>
          Add Metric Entry
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 8
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

          {/* Metric Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 8
            }}>
              Metric Name
            </label>
            <input
              type="text"
              value={metricName}
              onChange={e => setMetricName(e.target.value)}
              placeholder="e.g., sleep_hours, weight, steps"
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

          {/* Value */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 8
            }}>
              Value
            </label>
            <input
              type="number"
              step="0.1"
              value={metricValue}
              onChange={e => setMetricValue(e.target.value)}
              placeholder="Enter value"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !metricName || !metricValue}
            style={{
              padding: '14px',
              background: saving || !metricName || !metricValue
                ? theme.border
                : `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving || !metricName || !metricValue ? 'not-allowed' : 'pointer',
              fontFamily: theme.fontFamily,
              marginTop: 8
            }}
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
