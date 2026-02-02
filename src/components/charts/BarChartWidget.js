import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Themed bar chart widget
 */
export const BarChartWidget = ({ data, dataKey, xDataKey, theme, height = 200 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis
          dataKey={xDataKey}
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 10 }}
          tickMargin={5}
          axisLine={{ stroke: theme.border }}
        />
        <YAxis
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 10 }}
          width={35}
          axisLine={{ stroke: theme.border }}
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
