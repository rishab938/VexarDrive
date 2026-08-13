import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DriverRow } from '../types';

interface HistogramProps {
  drivers: DriverRow[];
}

export const Histogram: React.FC<HistogramProps> = ({ drivers }) => {
  const chartData = useMemo(() => {
    // We create bins of width 10: 0-10, 10-20, ..., 90-100
    const bins = Array.from({ length: 10 }, (_, i) => ({
      name: `${i * 10}-${(i + 1) * 10}`,
      count: 0,
      minScore: i * 10,
    }));

    drivers.forEach((d) => {
      const score = d.Risk_Score;
      const binIdx = Math.min(Math.floor(score / 10), 9);
      bins[binIdx].count += 1;
    });

    return bins;
  }, [drivers]);

  // Color code based on bin min score
  const getBinColor = (minScore: number) => {
    if (minScore < 20) return '#10b981'; // emerald (Very Safe)
    if (minScore < 45) return '#14b8a6'; // teal (Safe)
    if (minScore < 70) return '#f59e0b'; // amber (Moderate)
    if (minScore < 90) return '#f97316'; // orange (High)
    return '#ef4444'; // red (Critical)
  };

  const isLight = document.body.classList.contains('light-mode');
  const axisColor = isLight ? '#334155' : 'rgba(255, 255, 255, 0.5)';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';
  const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)';
  const tooltipTextColor = isLight ? '#0f172a' : '#f8fafc';
  const tooltipBorderColor = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)';

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="name"
            stroke={axisColor}
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke={axisColor}
            fontSize={11}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${tooltipBorderColor}`,
              borderRadius: '12px',
              color: tooltipTextColor,
            }}
            cursor={{ fill: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}
            labelFormatter={(label) => `Risk Score Range: ${label}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBinColor(entry.minScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
