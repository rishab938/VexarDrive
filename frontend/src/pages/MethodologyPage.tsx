import React, { useState, useEffect } from 'react';
import { fetchMethodology } from '../services/api';
import { MethodologyDetails } from '../types';
import { Shield, Hammer, Info, HelpCircle, Activity } from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  const [methodology, setMethodology] = useState<MethodologyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMethodology()
      .then((data) => {
        setMethodology(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading || !methodology) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const dt = methodology.dynamic_thresholds;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Introduction Card */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Hammer className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Analytical Methodology & Assumptions</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          VexarDrive Fleet Intelligence operates on a transparent, deterministic mathematical pipeline.
          This model computes driver risks and identifies anomalous vehicle sensor signatures from high-frequency raw accelerometer, gyroscope, speed, and GPS coordinates.
        </p>
      </div>

      {/* Driver Risk Scoring Model */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Driver Risk Scoring Model</h3>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-sans">
            Driver scores evaluate safety violations density normalized across the active fleet.
            The final score runs between 0 (safest) and 100 (highest risk).
          </p>

          <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl font-mono text-indigo-300 text-xs overflow-x-auto">
            Risk_Score = (
              0.35 * norm_risk_density 
            + 0.20 * norm_braking 
            + 0.15 * norm_acceleration 
            + 0.15 * norm_turning 
            + 0.15 * norm_risky_trips
            ) * 100
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Scoring Components Weights</span>
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Risk Events Density (events/km)</td><td className="py-2 text-right text-indigo-400 font-bold">35%</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Hard Braking Density (events/km)</td><td className="py-2 text-right text-indigo-400 font-bold">20%</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Sudden Acceleration Density (events/km)</td><td className="py-2 text-right text-indigo-400 font-bold">15%</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Sharp Turning Density (events/km)</td><td className="py-2 text-right text-indigo-400 font-bold">15%</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Risky Trips Consistency (%)</td><td className="py-2 text-right text-indigo-400 font-bold">15%</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Safety Status Classifications</span>
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Very Safe</td><td className="py-2 text-right text-emerald-400 font-bold">0 – 20</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Safe</td><td className="py-2 text-right text-teal-400 font-bold">21 – 45</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Moderate Risk</td><td className="py-2 text-right text-amber-400 font-bold">46 – 70</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">High Risk</td><td className="py-2 text-right text-orange-400 font-bold">71 – 90</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Critical Risk</td><td className="py-2 text-right text-red-400 font-bold">91 – 100</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Thresholds Configuration */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Derived Dynamic Thresholds</h3>
        </div>
        <p className="text-xs text-slate-400 font-sans">
          To ensure calibration across different vehicle types or terrains, safety thresholds are derived dynamically from the uploaded telemetry distribution using the 2.5x IQR method for IMUs and the 95th percentile for speed.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950 text-slate-500 uppercase font-semibold">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3">Event Trigger</th>
                <th className="px-4 py-3">Mathematical Condition</th>
                <th className="px-4 py-3">Current Computed Threshold</th>
                <th className="px-4 py-3">Statistical Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium text-slate-300">
              <tr>
                <td className="px-4 py-3">Sudden Acceleration</td>
                <td className="px-4 py-3 font-mono">Accel_X_g &gt; {dt.sudden_accel} g</td>
                <td className="px-4 py-3 font-mono text-indigo-400">+{dt.sudden_accel.toFixed(3)} g</td>
                <td className="px-4 py-3">Q3 + 2.5 * IQR (X-axis)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Hard Braking</td>
                <td className="px-4 py-3 font-mono">Accel_X_g &lt; {dt.hard_braking} g</td>
                <td className="px-4 py-3 font-mono text-indigo-400">{dt.hard_braking.toFixed(3)} g</td>
                <td className="px-4 py-3">Q1 - 2.5 * IQR (X-axis)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Sharp Lateral</td>
                <td className="px-4 py-3 font-mono">abs(Accel_Y_g) &gt; {dt.sharp_lateral} g</td>
                <td className="px-4 py-3 font-mono text-indigo-400">±{dt.sharp_lateral.toFixed(4)} g</td>
                <td className="px-4 py-3">Q3 + 2.5 * IQR (Y-axis)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Sharp Turn</td>
                <td className="px-4 py-3 font-mono">abs(Gyro_Z_dps) &gt; {dt.sharp_turn} dps</td>
                <td className="px-4 py-3 font-mono text-indigo-400">±{dt.sharp_turn.toFixed(4)} dps</td>
                <td className="px-4 py-3">Q3 + 2.5 * IQR (Z-axis rotation)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">High Speed</td>
                <td className="px-4 py-3 font-mono">Speed_kmph &gt; {dt.high_speed} km/h</td>
                <td className="px-4 py-3 font-mono text-indigo-400">{dt.high_speed.toFixed(1)} km/h</td>
                <td className="px-4 py-3">95th Percentile Speed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Health Scoring Model */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Vehicle Health & Mechanical Anomaly Score</h3>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-sans">
            Unlike driver scoring where high is worse, <strong>100 is healthiest for vehicles</strong>, and 0 indicates high concern.
            It isolates vertical shock, frame rotation, and consistency of anomaly persistence.
          </p>

          <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl font-mono text-indigo-300 text-xs overflow-x-auto">
            Concern_Index = 0.30 * norm_accel_z_dev + 0.30 * norm_gyro_xy_mag + 0.20 * norm_gyro_z_spike + 0.20 * norm_persistence
            <br />
            Health_Score = (1.0 - Concern_Index) * 100
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Model Parameters</span>
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-slate-300 font-medium">Accel-Z shock deviation (30%)</td>
                    <td className="py-2 font-mono">abs(Accel_Z_g - 1.0)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-slate-300 font-medium">Gyroscope XY plane rate (30%)</td>
                    <td className="py-2 font-mono">sqrt(Gyro_X^2 + Gyro_Y^2)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-slate-300 font-medium">Gyro-Z spike rate (20%)</td>
                    <td className="py-2 font-mono">abs(Z) &gt; mean + 3*std</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-slate-300 font-medium">Anomaly trip persistence (20%)</td>
                    <td className="py-2 font-sans">% trips &gt; p75 threshold</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Status Classifications</span>
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Healthy</td><td className="py-2 text-right text-emerald-400 font-bold">80 – 100</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Monitor</td><td className="py-2 text-right text-yellow-400 font-bold">60 – 79</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">Inspection Recommended</td><td className="py-2 text-right text-orange-400 font-bold">40 – 59</td></tr>
                  <tr className="border-b border-white/5"><td className="py-2 text-slate-300 font-medium">High Maintenance Concern</td><td className="py-2 text-right text-red-400 font-bold">0 – 39</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Assumptions & Limitations */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Fleet Model Assumptions & Limitations</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-400 font-sans leading-relaxed">
          <div className="space-y-2">
            <span className="block font-semibold text-slate-300">Underlying Model Assumptions</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Distance calculations accumulate sequential points assuming spherical geodesics (Haversine formula).</li>
              <li>A normal gravity vector is assumed constant (1.0g vertical) on the Z-axis of IMU.</li>
              <li>Calculations assume the device is securely mounted to the vehicle chassis.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <span className="block font-semibold text-slate-300">Analytical Limitations</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Frame vibrations can arise from rough road paths rather than mechanical failures.</li>
              <li>Telemetry intervals are sampled per-minute; momentary spikes between minutes are not captured.</li>
              <li>Frame orientations or slips affect sensor values and may introduce noise.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
