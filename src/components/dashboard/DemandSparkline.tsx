/**
 * src/components/dashboard/DemandSparkline.tsx
 *
 * Pure SVG sparkline. No chart library. No d3. No recharts.
 *
 * - Viewbox: "0 0 200 60"
 * - Y-axis: auto-scaled to min/max of data, padded 5 units each side.
 * - Line path: M command for first point, then L for each subsequent.
 * - Dot at the last data point.
 * - Color: green-500 if trending up, red-400 if down, gray-400 if flat.
 */

interface DemandSparklineProps {
  data: number[];
  label: string;
}

export default function DemandSparkline({ data, label }: DemandSparklineProps) {
  if (data.length < 2) return null;

  // ── Scale computation ───────────────────────────────────────────────────────
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const yMin = dataMin - 5;
  const yMax = dataMax + 5;
  const yRange = yMax - yMin || 1; // avoid division by zero

  const viewWidth = 200;
  const viewHeight = 60;
  const padX = 8;  // horizontal padding so dots aren't clipped
  const usableWidth = viewWidth - padX * 2;

  // Map data index → x, data value → y (SVG y is inverted: top=0)
  const points = data.map((val, i) => ({
    x: padX + (i / (data.length - 1)) * usableWidth,
    y: viewHeight - ((val - yMin) / yRange) * viewHeight,
  }));

  // ── Build SVG path: M + (data.length - 1) × L ────────────────────────────
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // ── Trend color ─────────────────────────────────────────────────────────────
  const first = data[0];
  const last = data[data.length - 1];
  let lineColor: string;
  if (last > first) {
    lineColor = "#22c55e"; // green-500
  } else if (last < first) {
    lineColor = "#f87171"; // red-400
  } else {
    lineColor = "#9ca3af"; // gray-400
  }

  const lastPoint = points[points.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Sparkline: ${label}. Trend: ${last >= first ? "up" : "down"} from ${first} to ${last}.`}
      >
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`${pathD} L ${lastPoint.x.toFixed(1)} ${viewHeight} L ${points[0].x.toFixed(1)} ${viewHeight} Z`}
          fill="url(#spark-fill)"
        />

        {/* Line path */}
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dot at last point */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3.5"
          fill={lineColor}
          stroke="#111827"
          strokeWidth="1.5"
        />
      </svg>

      {/* Label */}
      <span className="text-xs text-brand-500 font-medium text-center">
        {label}
      </span>
    </div>
  );
}
