import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { VehicleRow } from '../types';

interface AnomalyScatterPlotProps {
  vehicles: VehicleRow[];
  onVehicleClick?: (vehicleId: string) => void;
}

export const AnomalyScatterPlot: React.FC<AnomalyScatterPlotProps> = ({
  vehicles,
  onVehicleClick,
}) => {
  const chartData = vehicles.map((v) => ({
    x: Number(v.mean_accel_z_dev),
    y: Number(v.gyro_z_spike_rate) * 100, // Show as percentage
    z: Number(v.trips),
    id: v.Vehicle_ID,
    status: v.Health_Status,
    score: v.Health_Score,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
        return '#10b981'; // emerald
      case 'Monitor':
        return '#eab308'; // yellow
      case 'Inspection Recommended':
        return '#f97316'; // orange
      case 'High Maintenance Concern':
        return '#ef4444'; // red
      default:
        return '#6366f1'; // indigo
    }
  };

  const handlePointClick = (data: any) => {
    if (onVehicleClick && data && data.payload) {
      onVehicleClick(data.payload.id);
    }
  };

  const isLight = document.body.classList.contains('light-mode');
  const axisColor = isLight ? '#334155' : 'rgba(255, 255, 255, 0.5)';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';

  // Custom tooltip content to show details nicely
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/90 light-mode:bg-white/95 backdrop-blur-xl border border-white/10 light-mode:border-slate-200 p-3 rounded-xl text-slate-100 light-mode:text-slate-900 shadow-xl text-xs space-y-1">
          <p className="font-bold text-sm text-indigo-400 light-mode:text-indigo-600">{data.id}</p>
          <p><span className="text-slate-400 light-mode:text-slate-500">Health Score:</span> <span className="font-bold">{data.score.toFixed(1)}</span></p>
          <p><span className="text-slate-400 light-mode:text-slate-500">Status:</span> <span className="font-bold" style={{ color: getStatusColor(data.status) }}>{data.status}</span></p>
          <p><span className="text-slate-400 light-mode:text-slate-500">Mean Accel-Z Dev:</span> <span className="font-mono">{data.x.toFixed(4)}g</span></p>
          <p><span className="text-slate-400 light-mode:text-slate-500">Gyro-Z Spike Rate:</span> <span className="font-mono">{data.y.toFixed(2)}%</span></p>
          <p><span className="text-slate-400 light-mode:text-slate-500">Total Trips:</span> <span className="font-bold">{data.z}</span></p>
          <p className="text-[10px] text-indigo-300 light-mode:text-indigo-500 italic mt-1 select-none">Click bubble to inspect details</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[320px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            type="number"
            dataKey="x"
            name="Mean Accel-Z Deviation"
            unit="g"
            stroke={axisColor}
            fontSize={11}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Gyro-Z Spike Rate"
            unit="%"
            stroke={axisColor}
            fontSize={11}
            tickLine={false}
            domain={[0, 'auto']}
          />
          <ZAxis
            type="number"
            dataKey="z"
            range={[80, 450]}
            name="Trips count"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
          <Scatter 
            name="Vehicles" 
            data={chartData} 
            onClick={handlePointClick}
            className="cursor-pointer"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getStatusColor(entry.status)} 
                fillOpacity={0.7}
                stroke={getStatusColor(entry.status)}
                strokeWidth={1.5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
