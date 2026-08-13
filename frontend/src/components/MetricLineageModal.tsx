import React from 'react';
import { X, Info } from 'lucide-react';

export interface MetricLineage {
  name: string;
  formula: string;
  sourceColumns: string[];
  aggregationLevel: string;
  normalization: string;
  thresholds: string;
  reason: string;
  assumptions: string;
}

interface MetricLineageModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineage: MetricLineage | null;
}

export const MetricLineageModal: React.FC<MetricLineageModalProps> = ({
  isOpen,
  onClose,
  lineage,
}) => {
  if (!isOpen || !lineage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
      />
      
      {/* Glassmorphic Modal Content */}
      <div className="glass-panel w-full max-w-xl rounded-2xl relative overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">{lineage.name} Lineage & Traceability</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Mathematical Formula</span>
            <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl font-mono text-indigo-300 overflow-x-auto">
              {lineage.formula}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Source Dataset Columns</span>
              <span className="text-slate-200 font-semibold">{lineage.sourceColumns.join(', ')}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Aggregation Grain</span>
              <span className="text-slate-200 font-semibold">{lineage.aggregationLevel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Normalization Method</span>
              <span className="text-slate-200 font-semibold">{lineage.normalization}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Threshold Configurations</span>
              <span className="text-slate-200 font-semibold">{lineage.thresholds}</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 font-sans">Business Reason & Operational Value</span>
            <p className="text-slate-300 leading-relaxed font-sans">{lineage.reason}</p>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 font-sans">Underlying Assumptions</span>
            <p className="text-slate-400 italic leading-relaxed font-sans">{lineage.assumptions}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-4 mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-semibold transition-colors"
          >
            Close Traceability Details
          </button>
        </div>
      </div>
    </div>
  );
};

// Lineage dictionary helper to load configurations
export const getMetricLineage = (metricName: string, dynamicThresholds?: any): MetricLineage => {
  const dt = dynamicThresholds || {
    sudden_accel: 0.252,
    hard_braking: -0.252,
    sharp_lateral: 0.2375,
    sharp_turn: 8.4525,
    high_speed: 41.8
  };

  const dict: Record<string, MetricLineage> = {
    "Driver Risk Score": {
      name: "Driver Risk Score",
      formula: "Risk_Score = (0.35 * norm_risk_density + 0.20 * norm_braking + 0.15 * norm_acceleration + 0.15 * norm_turning + 0.15 * norm_risky_trips) * 100",
      sourceColumns: ["Accel_X_g", "Accel_Y_g", "Gyro_Z_dps", "Speed_kmph", "Trip_ID"],
      aggregationLevel: "Driver level (one value per driver)",
      normalization: "Min-Max normalization across fleet: (val - min) / (max - min)",
      thresholds: "Configured weights: Risk Density (35%), Hard Braking (20%), Sudden Accel (15%), Turning (15%), Risky Trips (15%)",
      reason: "Provides a single dashboard parameter of driver hazard profiles for fleet operator routing decisions.",
      assumptions: "Assumes all five behaviors are correlated with accident risk on two-wheelers."
    },
    "Vehicle Health Score": {
      name: "Vehicle Health Score",
      formula: "Health_Score = (1.0 - (0.30 * norm_accel_z + 0.30 * norm_gyro_xy + 0.20 * norm_gyro_z_spike + 0.20 * norm_persistence)) * 100",
      sourceColumns: ["Accel_Z_g", "Gyro_X_dps", "Gyro_Y_dps", "Gyro_Z_dps", "Trip_ID"],
      aggregationLevel: "Vehicle level (one value per vehicle)",
      normalization: "Min-Max normalization of sensor deviations across all vehicles in the fleet.",
      thresholds: "Weights: Accel-Z Dev (30%), Gyro XY Mag (30%), Gyro-Z Spike Rate (20%), Trip Persistence (20%)",
      reason: "Flags bikes operating with anomalous vibrations or mechanical instability across multiple drivers.",
      assumptions: "Sensor deviations are markers of structural wear, tyre issues, suspension decay, or bad calibration."
    },
    "Fleet Distance": {
      name: "Fleet Distance",
      formula: "Distance_KM = Sum(Haversine(prev_point, current_point)) per Trip_ID",
      sourceColumns: ["Latitude", "Longitude", "Timestamp", "Trip_ID"],
      aggregationLevel: "Trip level aggregated to Driver, Vehicle and Fleet levels",
      normalization: "None (raw GPS kilometers accumulation)",
      thresholds: "N/A",
      reason: "Calculates the total geographical operating range of the delivery fleet.",
      assumptions: "Haversine formula assumes a spherical Earth with radius R = 6371.0 km."
    },
    "Hard Braking": {
      name: "Hard Braking",
      formula: `Accel_X_g < ${dt.hard_braking} g`,
      sourceColumns: ["Accel_X_g", "Timestamp"],
      aggregationLevel: "Telemetry level (per minute sensor events)",
      normalization: "None",
      thresholds: `Derived via 2.5x IQR method: < ${dt.hard_braking} g`,
      reason: "Identifies sudden deceleration events which correlate directly with safety risk.",
      assumptions: "Sensor X-axis represents the vehicle's longitudinal movement."
    },
    "Sudden Acceleration": {
      name: "Sudden Acceleration",
      formula: `Accel_X_g > ${dt.sudden_accel} g`,
      sourceColumns: ["Accel_X_g", "Timestamp"],
      aggregationLevel: "Telemetry level (per minute sensor events)",
      normalization: "None",
      thresholds: `Derived via 2.5x IQR method: > ${dt.sudden_accel} g`,
      reason: "Flags aggressive acceleration, leading to increased tyre wear and battery/fuel consumption.",
      assumptions: "Longitudinal acceleration is positive forwards."
    },
    "Sharp Lateral": {
      name: "Sharp Lateral Movement",
      formula: `abs(Accel_Y_g) > ${dt.sharp_lateral} g`,
      sourceColumns: ["Accel_Y_g", "Timestamp"],
      aggregationLevel: "Telemetry level (per minute sensor events)",
      normalization: "None",
      thresholds: `Derived via 2.5x IQR method: > ${dt.sharp_lateral} g`,
      reason: "Detects weaving in traffic, sharp lane changes, or lateral slips.",
      assumptions: "Y-axis captures lateral/sideways acceleration."
    },
    "Sharp Turn": {
      name: "Sharp Turn",
      formula: `abs(Gyro_Z_dps) > ${dt.sharp_turn} dps`,
      sourceColumns: ["Gyro_Z_dps", "Timestamp"],
      aggregationLevel: "Telemetry level (per minute sensor events)",
      normalization: "None",
      thresholds: `Derived via 2.5x IQR method: > ${dt.sharp_turn} dps`,
      reason: "Identifies aggressive cornering speeds on two-wheelers.",
      assumptions: "Z-axis rotational rate represents yaw cornering rotation."
    },
    "High Speed": {
      name: "High Speed",
      formula: `Speed_kmph > ${dt.high_speed} kmph`,
      sourceColumns: ["Speed_kmph", "Timestamp"],
      aggregationLevel: "Telemetry level (per minute sensor events)",
      normalization: "None",
      thresholds: `95th percentile of entire telemetry dataset: > ${dt.high_speed} kmph`,
      reason: "Flags speeding above fleet speed thresholds.",
      assumptions: "Calculated speed from wheels/GPS is accurate."
    }
  };

  return dict[metricName] || {
    name: metricName,
    formula: "Custom calculation",
    sourceColumns: ["Raw columns"],
    aggregationLevel: "Fleet aggregation",
    normalization: "None",
    thresholds: "N/A",
    reason: "Operations intelligence metrics.",
    assumptions: "Determined from telemetry observations."
  };
};
