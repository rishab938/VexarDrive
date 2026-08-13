import React from 'react';
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

interface EventBreakdownProps {
  eventsData: {
    high_speed: number;
    sharp_turn: number;
    sudden_accel: number;
    sharp_lateral: number;
    hard_braking: number;
  } | null;
}

export const EventBreakdown: React.FC<EventBreakdownProps> = ({ eventsData }) => {
  if (!eventsData) {
    return <div className="text-slate-500 text-center py-12">No event data available.</div>;
  }

  const chartData = [
    { name: 'High Speed', count: eventsData.high_speed, color: '#f59e0b' },
    { name: 'Sharp Turn', count: eventsData.sharp_turn, color: '#aa3bff' },
    { name: 'Sudden Acceleration', count: eventsData.sudden_accel, color: '#3b82f6' },
    { name: 'Sharp Lateral', count: eventsData.sharp_lateral, color: '#06b6d4' },
    { name: 'Hard Braking', count: eventsData.hard_braking, color: '#ef4444' },
  ].sort((a, b) => b.count - a.count); // Sort descending

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
          layout="vertical"
          margin={{ top: 10, right: 10, left: 30, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis
            type="number"
            stroke={axisColor}
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={axisColor}
            fontSize={11}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${tooltipBorderColor}`,
              borderRadius: '12px',
              color: tooltipTextColor,
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
