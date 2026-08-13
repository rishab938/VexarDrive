import React, { useState, useEffect } from 'react';
import { fetchOverview } from './services/api';
import { OverviewMetrics } from './types';
import { DriverDashboard } from './pages/DriverDashboard';
import { VehicleDashboard } from './pages/VehicleDashboard';
import { MethodologyPage } from './pages/MethodologyPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { Sun, Moon, Compass, Users, Activity, HelpCircle, ShieldCheck, ArrowRight, Star } from 'lucide-react';

type TabType = 'drivers' | 'vehicles' | 'methodology' | 'data-quality';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('drivers');
  const [overviewData, setOverviewData] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightMode, setLightMode] = useState(false);

  // States for sharing click selection between tabs
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const loadOverview = () => {
    setIsLoading(true);
    setError(null);
    fetchOverview()
      .then((data) => {
        setOverviewData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Connection failed. Start the backend server on port 8000.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Sync light mode class to document body
  useEffect(() => {
    if (lightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [lightMode]);

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setActiveTab('vehicles');
  };

  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    setActiveTab('drivers');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'drivers':
        return (
          <DriverDashboard
            overviewData={overviewData}
            onSelectVehicle={handleSelectVehicle}
          />
        );
      case 'vehicles':
        return (
          <VehicleDashboard
            overviewData={overviewData}
            onSelectDriver={handleSelectDriver}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
          />
        );
      case 'methodology':
        return <MethodologyPage />;
      case 'data-quality':
        return <DataQualityPage onUploadSuccess={loadOverview} />;
      default:
        return <DriverDashboard overviewData={overviewData} onSelectVehicle={handleSelectVehicle} />;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'drivers':
        return 'Driver Behaviour & Risk Intelligence';
      case 'vehicles':
        return 'Vehicle Health & Telemetry Anomalies';
      case 'methodology':
        return 'Analytics Methodology & Scoring Weights';
      case 'data-quality':
        return 'Data Quality Auditing & Ingestion';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col transition-colors duration-500 overflow-hidden">
      {/* Background patterns overlay */}
      <div className="absolute inset-0 bg-dot-pattern opacity-100 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

      {/* Decorative Pulsing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 light-mode:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-float animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 light-mode:bg-purple-500/5 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

      {/* Floating Theme Selector (accessible globally in top-right) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setLightMode(!lightMode)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 light-mode:bg-white/60 backdrop-blur-xl border border-white/10 light-mode:border-slate-200 text-slate-300 light-mode:text-slate-700 hover:text-indigo-400 light-mode:hover:text-indigo-600 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
        >
          {lightMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-extrabold hidden sm:inline tracking-wide">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-extrabold hidden sm:inline tracking-wide">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {!showDashboard ? (
        /* LANDING PAGE */
        <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
          <div className="max-w-3xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Logo / Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/40 light-mode:bg-white/40 border border-white/5 light-mode:border-slate-200/50 backdrop-blur-xl shadow-lg">
              <Compass className="w-5 h-5 text-indigo-500 animate-spin-slow" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 light-mode:text-slate-600">
                Operations Intelligence Console
              </span>
            </div>

            {/* Title */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none">
                <span className="title-gradient">
                  VEXARDRIVE
                </span>
              </h1>
              <p className="text-base sm:text-lg font-medium text-slate-400 light-mode:text-slate-600 max-w-xl mx-auto leading-relaxed font-sans">
                High-frequency delivery telemetry analytics, chassis mechanical health indices, and safe-driving validations.
              </p>
            </div>

            {/* Central Call-To-Action Card */}
            <div className="glass-panel p-8 rounded-3xl max-w-xl mx-auto space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100 light-mode:text-slate-900">Enter Operations Control</h3>
                <p className="text-xs text-slate-500">
                  Analyze two-wheeler telemetry data logs, isolate driver risks, and trace chassis signatures.
                </p>
              </div>

              {/* Quick statistics layout */}
              <div className="grid grid-cols-3 gap-3 border-y border-white/5 light-mode:border-slate-200/50 py-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-indigo-400">
                    {isLoading ? '...' : overviewData?.total_drivers || 0}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Drivers</span>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-indigo-400">
                    {isLoading ? '...' : overviewData?.total_vehicles || 0}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Bikes</span>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-indigo-400">
                    {isLoading ? '...' : `${Math.round(overviewData?.total_distance || 0).toLocaleString()}`}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">KM Logged</span>
                </div>
              </div>

              {/* Get Started Trigger */}
              <div className="pt-2">
                <button
                  onClick={() => setShowDashboard(true)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 flex items-center justify-center gap-2 group transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* Bottom info link */}
            {error && (
              <p className="text-xs text-red-500 font-medium">
                {error} (FastAPI backend must be running on port 8000).
              </p>
            )}
          </div>
        </div>
      ) : (
        /* MAIN DASHBOARD LAYOUT (UNIFIED FLOATING GLASS PANEL SHELL) */
        <div className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10 w-full animate-in fade-in duration-500">
          <div className="max-w-7xl w-full h-[90vh] min-h-[600px] glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/10 light-mode:border-slate-200/50">
            
            {/* 1. LEFT SIDEBAR PANEL */}
            <aside className="w-full md:w-64 bg-slate-950/20 light-mode:bg-white/10 border-b md:border-b-0 md:border-r border-white/5 light-mode:border-slate-200/50 p-6 flex flex-col justify-between select-none">
              <div className="space-y-8">
                {/* Logo and Brand */}
                <div 
                  onClick={() => setShowDashboard(false)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h1 className="text-xs font-black tracking-wider uppercase text-slate-100 light-mode:text-slate-900 leading-none">
                      VexarDrive
                    </h1>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                      Fleet Intelligence
                    </span>
                  </div>
                </div>

                {/* Sidebar Navigation Menu Links */}
                <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                  {[
                    { id: 'drivers', label: 'Driver Behaviour', icon: Users },
                    { id: 'vehicles', label: 'Vehicle Health', icon: Activity },
                    { id: 'methodology', label: 'Methodology', icon: HelpCircle },
                    { id: 'data-quality', label: 'Data Quality', icon: ShieldCheck },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none w-full ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 scale-102 border-l-4 border-indigo-400'
                            : 'text-slate-400 hover:text-slate-200 light-mode:hover:text-slate-800 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar footer branding */}
              <div className="hidden md:block pt-4 border-t border-white/5 light-mode:border-slate-200/50">
                <p className="text-[9px] text-slate-500 font-medium">VexarDrive Operations &copy; 2026</p>
                <p className="text-[8px] text-slate-600 italic">Security Level: Fleet Administrator</p>
              </div>
            </aside>

            {/* 2. MAIN WORKSPACE CONTAINER */}
            <section className="flex-grow flex flex-col overflow-hidden bg-slate-950/5 light-mode:bg-slate-50/5">
              {/* Workspace Top Bar Header */}
              <header className="h-16 border-b border-white/5 light-mode:border-slate-200/50 px-6 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-bold text-slate-200 light-mode:text-slate-800 tracking-wide uppercase">
                  {getTabLabel()}
                </h2>
                
                {/* Connection Status indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-bold text-slate-400 light-mode:text-slate-600 uppercase tracking-wider">
                    Server Live
                  </span>
                </div>
              </header>

              {/* Scrollable page body */}
              <div className="flex-grow p-6 overflow-y-auto min-h-0">
                {error ? (
                  <div className="glass-card p-6 rounded-2xl max-w-md mx-auto text-center border-red-500/20 my-12">
                    <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-slate-100 mb-2">Backend Connection Required</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      The FastAPI server is disconnected. Start the server:
                    </p>
                    <div className="bg-slate-950 border border-white/5 p-3 rounded-xl font-mono text-indigo-300 text-xs mb-6 select-all">
                      python -m uvicorn backend.main:app --port 8000
                    </div>
                    <button
                      onClick={loadOverview}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-colors focus:outline-none"
                    >
                      Retry Connection
                    </button>
                  </div>
                ) : (
                  renderActiveTab()
                )}
              </div>
            </section>

          </div>
        </div>
      )}
    </div>
  );
}

// Simple fallback icon
const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default App;
