import { HeatmapCircle } from '@visx/heatmap';
import { scaleLinear } from '@visx/scale';

/**
 * Themed heatmap widget for activity visualization
 */
export const HeatmapWidget = ({ data, theme, width = 400, height = 200 }) => {
  const colorScale = scaleLinear({
    range: [theme.card, theme.accent],
    domain: [0, Math.max(...data.flatMap(d => d.bins.map(b => b.count)))],
  });

  return (
    <svg width={width} height={height}>
      <HeatmapCircle
        data={data}
        xScale={(d) => d * (width / 7)}
        yScale={(d) => d * (height / Math.ceil(data.length / 7))}
        colorScale={colorScale}
        binWidth={width / 7 - 4}
        binHeight={height / Math.ceil(data.length / 7) - 4}
        gap={4}
      >
        {(heatmap) =>
          heatmap.map((bins) =>
            bins.map((bin) => (
              <circle
                key={`heatmap-circle-${bin.row}-${bin.column}`}
                cx={bin.cx}
                cy={bin.cy}
                r={bin.r}
                fill={bin.color}
              />
            ))
          )
        }
      </HeatmapCircle>
    </svg>
  );
};
