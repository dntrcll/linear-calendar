import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Themed area chart widget
 */
export const AreaChartWidget = ({ data, dataKey, xDataKey, theme, height = 200 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <XAxis
          dataKey={xDataKey}
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 11 }}
        />
        <YAxis
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.text
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={theme.accent}
          fill={theme.accent}
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
