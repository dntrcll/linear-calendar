import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Themed bar chart widget
 */
export const BarChartWidget = ({ data, dataKey, xDataKey, theme, height = 200 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
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
        <Bar
          dataKey={dataKey}
          fill={theme.accent}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
