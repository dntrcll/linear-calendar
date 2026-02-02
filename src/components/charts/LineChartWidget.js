import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * @typedef {Object} LineChartWidgetProps
 * @property {Array<Object>} data - Chart data array
 * @property {string} dataKey - Key for Y-axis values
 * @property {string} xDataKey - Key for X-axis values
 * @property {Object} theme - Theme object from app context
 * @property {number} [height] - Chart height in pixels
 */

/**
 * Themed line chart widget
 * @param {LineChartWidgetProps} props
 */
export const LineChartWidget = ({ data, dataKey, xDataKey, theme, height = 200 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={theme.accent}
          strokeWidth={2}
          dot={{ fill: theme.accent, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
