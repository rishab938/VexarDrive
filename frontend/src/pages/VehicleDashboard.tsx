import React, { useState, useEffect } from 'react';
import { fetchVehicles, fetchVehicleDetail, fetchVehicleExplanation } from '../services/api';
import { VehicleRow, VehicleDetail } from '../types';
import { KpiCard } from '../components/KpiCard';
import { SortableTable, ColumnConfig } from '../components/SortableTable';
import { AnomalyScatterPlot } from '../charts/AnomalyScatterPlot';
import { ExplainerCard } from '../components/ExplainerCard';
import { MetricLineageModal, getMetricLineage, MetricLineage } from '../components/MetricLineageModal';
import { ShieldCheck, ChevronRight, X, Info, HelpCircle, AlertTriangle, Compass, Activity } from 'lucide-react';

interface VehicleDashboardProps {
  overviewData: any;
  onSelectDriver: (driverId: string) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
}

export const VehicleDashboard: React.FC<VehicleDashboardProps> = ({
  overviewData,
  onSelectDriver,
  selectedVehicleId,
  setSelectedVehicleId,
}) => {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleDetail, setVehicleDetail] = useState<VehicleDetail | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Traceability Modal State
  const [traceMetric, setTraceMetric] = useState<MetricLineage | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  useEffect(() => {
    fetchVehicles()
      .then((data) => {
        setVehicles(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  // Watch for external selectedVehicleId changes (e.g. from driver association links)
  useEffect(() => {
    if (selectedVehicleId) {
      handleLoadDetail(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const handleLoadDetail = (vehicleId: string) => {
    setIsLoadingDetail(true);
    Promise.all([
      fetchVehicleDetail(vehicleId),
      fetchVehicleExplanation(vehicleId)
    ])
      .then(([detail, expl]) => {
        setVehicleDetail(detail);
        setExplanation(expl);
        setIsLoadingDetail(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoadingDetail(false);
      });
  };

  const handleRowClick = (row: VehicleRow) => {
    setSelectedVehicleId(row.Vehicle_ID);
  };

  const openLineage = (metricName: string) => {
    const thresholds = overviewData?.dynamic_thresholds;
    const lin = getMetricLineage(metricName, thresholds);
    setTraceMetric(lin);
    setIsTraceOpen(true);
  };

  const filteredVehicles = vehicles.filter((v) =>
    statusFilter === 'All' || v.Health_Status === statusFilter
  );

  // Table columns definition
  const columns: ColumnConfig<VehicleRow>[] = [
    {
      key: 'Vehicle_ID',
      label: 'ID',
      render: (row) => (
        <span className="font-bold text-slate-100 dark:text-slate-100 light-mode:text-slate-900">{row.Vehicle_ID}</span>
      )
    },
    {
      key: 'Model',
      label: 'Vehicle Model',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200 dark:text-slate-200 light-mode:text-slate-800">{row.Make} {row.Model}</div>
          <div className="text-xs text-slate-500 font-sans">{row.Vehicle_Type} ({row.Manufacture_Year})</div>
        </div>
      )
    },
    {
      key: 'Health_Score',
      label: 'Health Score',
      isNumeric: true,
      render: (row) => (
        <span
          onClick={(e) => { e.stopPropagation(); openLineage("Vehicle Health Score"); }}
          className="font-bold font-mono-numbers px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 text-slate-100 hover:text-indigo-400 cursor-pointer text-sm"
        >
          {row.Health_Score.toFixed(1)}
        </span>
      )
    },
    {
      key: 'Health_Status',
      label: 'Health Status',
      render: (row) => {
        const colors = {
          'Healthy': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15',
          'Monitor': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/15',
          'Inspection Recommended': 'text-orange-400 bg-orange-500/10 border-orange-500/15',
          'High Maintenance Concern': 'text-red-400 bg-red-500/10 border-red-500/15',
        };
        const cls = colors[row.Health_Status as keyof typeof colors] || 'text-slate-400';
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
            {row.Health_Status}
          </span>
        );
      }
    },
    {
      key: 'trips',
      label: 'Trips',
      isNumeric: true,
      render: (row) => <span className="font-mono-numbers">{row.trips}</span>
    },
    {
      key: 'drivers',
      label: 'Operators',
      isNumeric: true,
      render: (row) => <span className="font-mono-numbers">{row.drivers}</span>
    },
    {
      key: 'mean_accel_z_dev',
      label: 'Accel Z Dev (mean)',
      isNumeric: true,
      render: (row) => (
        <span 
          onClick={(e) => { e.stopPropagation(); openLineage("Vehicle Health Score"); }}
          className="font-mono-numbers text-slate-400 hover:text-indigo-400 cursor-pointer"
        >
          {row.mean_accel_z_dev.toFixed(4)}g
        </span>
      )
    },
    {
      key: 'gyro_z_spike_rate',
      label: 'Gyro Z Spike %',
      isNumeric: true,
      render: (row) => (
        <span 
          onClick={(e) => { e.stopPropagation(); openLineage("Vehicle Health Score"); }}
          className="font-mono-numbers text-slate-400 hover:text-indigo-400 cursor-pointer"
        >
          {(row.gyro_z_spike_rate * 100).toFixed(2)}%
        </span>
      )
    },
    {
      key: 'persistence_rate',
      label: 'Anomaly Persistence',
      isNumeric: true,
      render: (row) => <span className="font-mono-numbers text-slate-300">{(row.persistence_rate * 100).toFixed(0)}%</span>
    },
    {
      key: 'action',
      label: '',
      sortable: false,
      render: () => <ChevronRight className="w-4 h-4 text-slate-500" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top statistics section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Inspected Vehicles"
          value={overviewData ? overviewData.total_vehicles : '...'}
          iconName="Settings"
          statusColor="indigo"
          isLoading={isLoading}
        />
        <KpiCard
          title="Fleet Avg Health Score"
          value={overviewData ? `${overviewData.avg_health_score}/100` : '...'}
          subtitle="Fleet average wear-level indicator"
          iconName="Activity"
          statusColor={overviewData && overviewData.avg_health_score < 75 ? 'amber' : 'emerald'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Telemetry Data Grains"
          value={overviewData ? '12,987 points' : '...'}
          subtitle="One-minute sampling intervals"
          iconName="HardDrive"
          statusColor="indigo"
          isLoading={isLoading}
        />
        <KpiCard
          title="Bikes Requiring Inspection"
          value={overviewData ? overviewData.vehicles_requiring_inspection : '...'}
          subtitle="High Maintenance Concern or Inspect"
          iconName="AlertTriangle"
          statusColor={overviewData && overviewData.vehicles_requiring_inspection > 0 ? 'red' : 'indigo'}
          isLoading={isLoading}
        />
      </div>

      {/* Main Grid: Scatter plot and Leaderboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 cols: Leaderboard table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Vehicle Health & Sensor Signature Index</h2>
              <p className="text-xs text-slate-500">Evaluating chassis vibration and rotational anomaly persistence</p>
            </div>
          </div>

          <SortableTable
            columns={columns}
            data={filteredVehicles}
            onRowClick={handleRowClick}
            searchKey="Vehicle_ID"
            searchPlaceholder="Search vehicle by ID (e.g. V02)..."
            defaultSortKey="Health_Score"
            defaultSortDirection="asc" // Worst first to highlight issues
            filterComponent={
              <div className="flex gap-2 text-xs">
                {['All', 'High Maintenance Concern', 'Inspection Recommended', 'Monitor', 'Healthy'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors focus:outline-none ${
                      statusFilter === status
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                        : 'glass-pill hover:bg-white/10'
                    }`}
                  >
                    {status.replace(' Concern', '').replace(' Recommended', '')}
                  </button>
                ))}
              </div>
            }
          />
        </div>

        {/* Right col: Multi-dimension anomaly bubble plot */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Multi-Sensor Anomaly Mapping</h3>
            <p className="text-xs text-slate-500">Mean Accel-Z Dev vs Gyro-Z Spike Rate (bubble size = trips)</p>
          </div>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <AnomalyScatterPlot 
              vehicles={vehicles} 
              onVehicleClick={(vId) => setSelectedVehicleId(vId)}
            />
          )}
          <div className="mt-4 p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Interpretation Guide</span>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bubbles in the top-right represent vehicles showing high vertical shock and yaw rate instability, suggesting inspection is recommended.
            </p>
          </div>
        </div>
      </div>

      {/* Side Slide-in Detail Drawer */}
      {selectedVehicleId && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          {/* Backdrop closer */}
          <div
            onClick={() => setSelectedVehicleId(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl glass-panel flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase font-sans">Vehicle Diagnostic details</span>
                  <h3 className="text-xl font-bold text-slate-100">
                    {vehicleDetail ? `${vehicleDetail.metrics.Vehicle_ID} (${vehicleDetail.metrics.Make} ${vehicleDetail.metrics.Model})` : 'Loading...'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              {isLoadingDetail || !vehicleDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Chassis Class</span>
                      <div className="text-xs font-bold text-slate-200 truncate">{vehicleDetail.metrics.Vehicle_Type}</div>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Odometer Start</span>
                      <div className="text-sm font-bold text-slate-200 font-mono-numbers">{vehicleDetail.metrics.Odometer_KM_Start_of_Week.toLocaleString()} km</div>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Registration Date</span>
                      <div className="text-sm font-bold text-slate-200">{vehicleDetail.metrics.Registration_Date}</div>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Last Serviced</span>
                      <div className="text-sm font-bold text-slate-200">{vehicleDetail.metrics.Last_Service_Date}</div>
                    </div>
                  </div>

                  {/* Vehicle Health Score Explainer */}
                  <ExplainerCard
                    id={vehicleDetail.metrics.Vehicle_ID}
                    explanation={explanation}
                    score={vehicleDetail.metrics.Health_Score}
                    category={vehicleDetail.metrics.Health_Status}
                    onOpenLineage={() => openLineage("Vehicle Health Score")}
                  />

                  {/* Association Analysis Card (Causation vs Correlation) */}
                  <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mb-2 font-sans">
                      <Info className="w-4 h-4 text-indigo-400" />
                      Driver vs. Vehicle Association Analysis
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {vehicleDetail.association_analysis}
                    </p>
                  </div>

                  {/* Detailed sensor averages */}
                  <div className="glass-card p-5 rounded-2xl">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Telemetry Anomaly Indicators</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 block mb-1">Mean Accel-Z Dev</span>
                        <div className="text-sm font-bold font-mono-numbers text-slate-200">{vehicleDetail.metrics.mean_accel_z_dev.toFixed(4)}g</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 block mb-1">P95 Accel-Z Dev</span>
                        <div className="text-sm font-bold font-mono-numbers text-slate-200">{vehicleDetail.metrics.p95_accel_z_dev.toFixed(4)}g</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 block mb-1">Mean Gyro XY</span>
                        <div className="text-sm font-bold font-mono-numbers text-slate-200">{vehicleDetail.metrics.mean_gyro_xy.toFixed(2)} dps</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 block mb-1">Gyro-Z Spike Rate</span>
                        <div className="text-sm font-bold font-mono-numbers text-slate-200">{(vehicleDetail.metrics.gyro_z_spike_rate * 100).toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Operators list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Associated Fleet Operators</h4>
                    {vehicleDetail.drivers && vehicleDetail.drivers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {vehicleDetail.drivers.map((d) => (
                          <div
                            key={d.Driver_ID}
                            onClick={() => { setSelectedVehicleId(null); onSelectDriver(d.Driver_ID); }}
                            className="bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 p-4 rounded-xl flex items-center justify-between cursor-pointer group transition-all duration-200"
                          >
                            <div>
                              <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{d.Driver_Name}</div>
                              <span className="text-[10px] text-slate-500 font-mono-numbers">
                                {d.trips} trips ({d.distance_km.toFixed(1)} km)
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/5 font-mono-numbers">
                                Risk Score: {d.Risk_Score.toFixed(0)}
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-1 font-sans">{d.Risk_Category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-950/30 p-4 border border-white/5 rounded-xl text-center">
                        No associated drivers found in telemetry logs.
                      </div>
                    )}
                  </div>

                  {/* Trip Evidence Logs */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trip Evidence Logs (Section 40 Traceability)</h4>
                    <div className="glass-card rounded-xl overflow-hidden border border-white/5 max-h-[250px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                          <tr className="border-b border-white/5">
                            <th className="px-4 py-2.5">Trip ID</th>
                            <th className="px-4 py-2.5">Driver</th>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5 text-right font-sans">Distance</th>
                            <th className="px-4 py-2.5 text-right font-sans">Duration</th>
                            <th className="px-4 py-2.5 text-right text-indigo-400">Total Events</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                          {vehicleDetail.trips.map((t) => (
                            <tr key={t.Trip_ID} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2.5 font-bold text-slate-100">{t.Trip_ID}</td>
                              <td className="px-4 py-2.5">{t.Driver_ID}</td>
                              <td className="px-4 py-2.5 font-sans">{t.Trip_Date}</td>
                              <td className="px-4 py-2.5 text-right font-mono-numbers">{t.Distance_KM.toFixed(1)} km</td>
                              <td className="px-4 py-2.5 text-right font-mono-numbers">{t.Duration_Min} min</td>
                              <td className="px-4 py-2.5 text-right font-mono-numbers text-indigo-400 font-bold">{t.total_events}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Traceability Modal */}
      <MetricLineageModal
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        lineage={traceMetric}
      />
    </div>
  );
};
