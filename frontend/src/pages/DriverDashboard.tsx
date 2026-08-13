import React, { useState, useEffect } from 'react';
import { fetchDrivers, fetchDriverDetail, fetchDriverExplanation } from '../services/api';
import { DriverRow, DriverDetail } from '../types';
import { KpiCard } from '../components/KpiCard';
import { SortableTable, ColumnConfig } from '../components/SortableTable';
import { Histogram } from '../charts/Histogram';
import { ExplainerCard } from '../components/ExplainerCard';
import { MetricLineageModal, getMetricLineage, MetricLineage } from '../components/MetricLineageModal';
import { ShieldAlert, Award, ChevronRight, X, Info, TrendingUp, Compass, Calendar, AlertTriangle } from 'lucide-react';

interface DriverDashboardProps {
  overviewData: any;
  onSelectVehicle: (vehicleId: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ overviewData, onSelectVehicle }) => {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // Traceability Modal State
  const [traceMetric, setTraceMetric] = useState<MetricLineage | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  useEffect(() => {
    fetchDrivers()
      .then((data) => {
        setDrivers(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleRowClick = (row: DriverRow) => {
    setSelectedDriverId(row.Driver_ID);
    setIsLoadingDetail(true);
    
    Promise.all([
      fetchDriverDetail(row.Driver_ID),
      fetchDriverExplanation(row.Driver_ID)
    ])
      .then(([detail, expl]) => {
        setDriverDetail(detail);
        setExplanation(expl);
        setIsLoadingDetail(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoadingDetail(false);
      });
  };

  const openLineage = (metricName: string) => {
    // Look up dynamic thresholds if available in overviewData or mock
    const thresholds = overviewData?.dynamic_thresholds;
    const lin = getMetricLineage(metricName, thresholds);
    setTraceMetric(lin);
    setIsTraceOpen(true);
  };

  const getStatusColor = (category: string) => {
    switch (category) {
      case 'Very Safe': return 'emerald';
      case 'Safe': return 'indigo';
      case 'Moderate Risk': return 'amber';
      case 'High Risk': return 'orange';
      case 'Critical Risk': return 'red';
      default: return 'indigo';
    }
  };

  const filteredDrivers = drivers.filter((d) => 
    categoryFilter === 'All' || d.Risk_Category === categoryFilter
  );

  // Table columns definition
  const columns: ColumnConfig<DriverRow>[] = [
    {
      key: 'Driver_ID',
      label: 'ID',
      render: (row) => (
        <span className="font-bold text-slate-100 dark:text-slate-100 light-mode:text-slate-900">{row.Driver_ID}</span>
      )
    },
    {
      key: 'Driver_Name',
      label: 'Driver Name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200 dark:text-slate-200 light-mode:text-slate-800">{row.Driver_Name}</div>
          <div className="text-xs text-slate-500 font-sans">{row.Home_Hub} Hub</div>
        </div>
      )
    },
    {
      key: 'Risk_Score',
      label: 'Risk Score',
      isNumeric: true,
      render: (row) => (
        <span 
          onClick={(e) => { e.stopPropagation(); openLineage("Driver Risk Score"); }}
          className="font-bold font-mono-numbers px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 text-slate-100 hover:text-indigo-400 cursor-pointer text-sm"
        >
          {row.Risk_Score.toFixed(1)}
        </span>
      )
    },
    {
      key: 'Risk_Category',
      label: 'Risk Category',
      render: (row) => {
        const colors = {
          'Very Safe': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15',
          'Safe': 'text-teal-400 bg-teal-500/10 border-teal-500/15',
          'Moderate Risk': 'text-amber-400 bg-amber-500/10 border-amber-500/15',
          'High Risk': 'text-orange-400 bg-orange-500/10 border-orange-500/15',
          'Critical Risk': 'text-red-400 bg-red-500/10 border-red-500/15',
        };
        const cls = colors[row.Risk_Category as keyof typeof colors] || 'text-slate-400';
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
            {row.Risk_Category}
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
      key: 'distance',
      label: 'Distance (km)',
      isNumeric: true,
      render: (row) => <span className="font-mono-numbers">{row.distance.toFixed(1)}</span>
    },
    {
      key: 'total_risk_events',
      label: 'Events',
      isNumeric: true,
      render: (row) => <span className="font-mono-numbers text-slate-300">{row.total_risk_events}</span>
    },
    {
      key: 'risk_events_per_km',
      label: 'Events / km',
      isNumeric: true,
      render: (row) => (
        <span 
          onClick={(e) => { e.stopPropagation(); openLineage("Driver Risk Score"); }}
          className="font-mono-numbers text-slate-400 hover:text-indigo-400 cursor-pointer"
        >
          {row.risk_events_per_km.toFixed(3)}
        </span>
      )
    },
    {
      key: 'pct_risky_trips',
      label: 'Risky Trips %',
      isNumeric: true,
      render: (row) => <span className="font-mono-numbers text-slate-300">{row.pct_risky_trips.toFixed(1)}%</span>
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
          title="Total Active Drivers"
          value={overviewData ? overviewData.total_drivers : '...'}
          iconName="Users"
          statusColor="indigo"
          isLoading={isLoading}
        />
        <KpiCard
          title="Fleet Avg Risk Score"
          value={overviewData ? `${overviewData.avg_risk_score}/100` : '...'}
          subtitle="Fleet average hazard level"
          iconName="Shield"
          statusColor={overviewData && overviewData.avg_risk_score > 70 ? 'red' : 'indigo'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Fleet Distance"
          value={overviewData ? `${overviewData.total_distance.toLocaleString()} km` : '...'}
          subtitle="Haversine telemetry sum"
          iconName="Compass"
          statusColor="emerald"
          isLoading={isLoading}
        />
        <KpiCard
          title="Critical / High Risk Drivers"
          value={overviewData ? overviewData.high_risk_drivers : '...'}
          subtitle="Risk Score > 70"
          iconName="AlertTriangle"
          statusColor={overviewData && overviewData.high_risk_drivers > 0 ? 'red' : 'indigo'}
          isLoading={isLoading}
        />
      </div>

      {/* Main Grid: Histogram and Leaderboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 cols: Leaderboard table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Driver Safety Leaderboard</h2>
              <p className="text-xs text-slate-500">Sorted by dynamic risk score factors</p>
            </div>
          </div>

          <SortableTable
            columns={columns}
            data={filteredDrivers}
            onRowClick={handleRowClick}
            searchKey="Driver_Name"
            searchPlaceholder="Search driver by name..."
            defaultSortKey="Risk_Score"
            defaultSortDirection="desc"
            filterComponent={
              <div className="flex gap-2 text-xs">
                {['All', 'Critical Risk', 'High Risk', 'Moderate Risk', 'Safe', 'Very Safe'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors focus:outline-none ${
                      categoryFilter === cat
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                        : 'glass-pill hover:bg-white/10'
                    }`}
                  >
                    {cat.replace(' Risk', '')}
                  </button>
                ))}
              </div>
            }
          />
        </div>

        {/* Right col: Score Distribution Chart */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Safety Risk Distribution</h3>
            <p className="text-xs text-slate-500">Count of drivers per 10-point score band</p>
          </div>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <Histogram drivers={drivers} />
          )}
          <div className="mt-4 p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Methodology Note</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Risk scores are computed on driver safety violations density per kilometer. Safe ranges (0-45) appear green/teal, and critical scores (70+) appear red.
            </p>
          </div>
        </div>
      </div>

      {/* Side Slide-in Detail Drawer */}
      {selectedDriverId && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          {/* Backdrop click closer */}
          <div 
            onClick={() => setSelectedDriverId(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            {/* Elevated glass slide-out panel */}
            <div className="w-screen max-w-2xl glass-panel flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Driver Profile Detail</span>
                  <h3 className="text-xl font-bold text-slate-100">
                    {driverDetail ? driverDetail.metrics.Driver_Name : 'Loading...'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedDriverId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              {isLoadingDetail || !driverDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Demographics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Driver ID</span>
                      <div className="text-sm font-bold text-slate-200">{driverDetail.metrics.Driver_ID}</div>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Home Hub</span>
                      <div className="text-sm font-bold text-slate-200">{driverDetail.metrics.Home_Hub}</div>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">License Experience</span>
                      <div className="text-sm font-bold text-slate-200">{driverDetail.metrics.License_Experience_Years} Years</div>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Joined Fleet</span>
                      <div className="text-sm font-bold text-slate-200">{driverDetail.metrics.Date_Joined_Fleet}</div>
                    </div>
                  </div>

                  {/* Score Explainer Card */}
                  <ExplainerCard
                    id={driverDetail.metrics.Driver_ID}
                    explanation={explanation}
                    score={driverDetail.metrics.Risk_Score}
                    category={driverDetail.metrics.Risk_Category}
                    onOpenLineage={() => openLineage("Driver Risk Score")}
                  />

                  {/* Safety violations breakdown card */}
                  <div className="glass-card p-5 rounded-2xl">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Safety Violations Counts</h4>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl hover:border-amber-500/30 cursor-pointer transition-colors" onClick={() => openLineage("High Speed")}>
                        <span className="text-[10px] text-slate-500 block mb-1">Speeding</span>
                        <div className="text-xl font-bold font-mono-numbers text-amber-500">{driverDetail.metrics.high_speed_events}</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl hover:border-red-500/30 cursor-pointer transition-colors" onClick={() => openLineage("Hard Braking")}>
                        <span className="text-[10px] text-slate-500 block mb-1">Hard Brake</span>
                        <div className="text-xl font-bold font-mono-numbers text-red-500">{driverDetail.metrics.hard_braking_events}</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl hover:border-blue-500/30 cursor-pointer transition-colors" onClick={() => openLineage("Sudden Acceleration")}>
                        <span className="text-[10px] text-slate-500 block mb-1">Sudden Acc</span>
                        <div className="text-xl font-bold font-mono-numbers text-blue-500">{driverDetail.metrics.sudden_acceleration_events}</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl hover:border-cyan-500/30 cursor-pointer transition-colors" onClick={() => openLineage("Sharp Lateral")}>
                        <span className="text-[10px] text-slate-500 block mb-1">Sharp Lat</span>
                        <div className="text-xl font-bold font-mono-numbers text-cyan-500">{driverDetail.metrics.sharp_lateral_events}</div>
                      </div>
                      <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl hover:border-purple-500/30 cursor-pointer transition-colors" onClick={() => openLineage("Sharp Turn")}>
                        <span className="text-[10px] text-slate-500 block mb-1">Sharp Turn</span>
                        <div className="text-xl font-bold font-mono-numbers text-purple-500">{driverDetail.metrics.sharp_turn_events}</div>
                      </div>
                    </div>
                  </div>

                  {/* Associated Vehicles operated by the driver */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Associated Vehicles Operated</h4>
                    {driverDetail.vehicles && driverDetail.vehicles.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {driverDetail.vehicles.map((v) => (
                          <div 
                            key={v.Vehicle_ID}
                            onClick={() => { setSelectedDriverId(null); onSelectVehicle(v.Vehicle_ID); }}
                            className="bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 p-4 rounded-xl flex items-center justify-between cursor-pointer group transition-all duration-200"
                          >
                            <div>
                              <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{v.Vehicle_ID}</div>
                              <div className="text-xs text-slate-500 font-sans">{v.Make} {v.Model}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/5 font-mono-numbers">
                                Health Score: {v.Health_Score.toFixed(0)}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono-numbers block mt-1">
                                {v.trips} trips ({v.distance_km.toFixed(1)} km)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-950/30 p-4 border border-white/5 rounded-xl text-center">
                        No vehicle associations found in telemetry logs.
                      </div>
                    )}
                  </div>

                  {/* Recent Trips Evidence Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trip Evidence Logs (Section 40 Traceability)</h4>
                    <div className="glass-card rounded-xl overflow-hidden border border-white/5 max-h-[250px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                          <tr className="border-b border-white/5">
                            <th className="px-4 py-2.5">Trip ID</th>
                            <th className="px-4 py-2.5">Vehicle</th>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5 text-right">Distance</th>
                            <th className="px-4 py-2.5 text-right">Speed (Avg/Max)</th>
                            <th className="px-4 py-2.5 text-right text-indigo-400">Events</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                          {driverDetail.trips.map((t) => (
                            <tr key={t.Trip_ID} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2.5 font-bold text-slate-100">{t.Trip_ID}</td>
                              <td className="px-4 py-2.5">{t.Vehicle_ID}</td>
                              <td className="px-4 py-2.5 font-sans">{t.Trip_Date}</td>
                              <td className="px-4 py-2.5 text-right font-mono-numbers">{t.Distance_KM.toFixed(1)} km</td>
                              <td className="px-4 py-2.5 text-right font-mono-numbers">{t.Avg_Speed_kmph.toFixed(0)}/{t.Max_Speed_kmph.toFixed(0)} km/h</td>
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

      {/* Traceability Lineage Modal */}
      <MetricLineageModal
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        lineage={traceMetric}
      />
    </div>
  );
};
