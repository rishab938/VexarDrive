import React, { useState, useEffect } from 'react';
import { fetchDataQuality, uploadDataset } from '../services/api';
import { DataQualityReport } from '../types';
import { ShieldAlert, CheckCircle, AlertTriangle, UploadCloud, FileSpreadsheet, Layers, RefreshCw } from 'lucide-react';

interface DataQualityPageProps {
  onUploadSuccess: () => void;
}

export const DataQualityPage: React.FC<DataQualityPageProps> = ({ onUploadSuccess }) => {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const loadReport = () => {
    setIsLoading(true);
    fetchDataQuality()
      .then((data) => {
        setReport(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    uploadDataset(files[0])
      .then((res) => {
        setUploading(false);
        setUploadSuccess(true);
        loadReport();
        onUploadSuccess(); // Re-trigger overview loading
      })
      .catch((err) => {
        console.error(err);
        setUploading(false);
        setUploadError(err.message || 'Error uploading file.');
      });
  };

  const getStatusIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle className="w-5 h-5 text-emerald-500" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* File Upload Zone */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="space-y-1 md:max-w-md">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              Upload Fleet Telemetry Dataset
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Upload a new VexarDrive multi-sheet Excel file (.xlsx) or CSV containing Telemetry, Trips, Drivers, or Vehicles logs to recalculate calculations in real-time.
            </p>
          </div>
          
          <div className="w-full md:w-auto">
            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/5 rounded-xl px-6 py-5 cursor-pointer transition-all duration-200 group text-center relative">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={uploading} 
              />
              <FileSpreadsheet className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
              <span className="text-xs text-slate-300 font-bold block mb-1">
                {uploading ? 'Processing File...' : 'Choose CSV / Excel'}
              </span>
              <span className="text-[10px] text-slate-500 block">Up to 50MB logs</span>
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Dataset successfully ingested and analytical metrics recalculated!</span>
          </div>
        )}
      </div>

      {/* Validation Pipeline Summary */}
      {isLoading || !report ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="md:col-span-1 space-y-4">
            <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-full">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ingestion Scorecard</h4>
                <div className="space-y-4 text-sm font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans">Rows Analyzed</span>
                    <span className="font-mono-numbers text-slate-200">{report.overall_summary.rows_analyzed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans">Duplicates Detected</span>
                    <span className="font-mono-numbers text-slate-200">{report.overall_summary.duplicate_records}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans">Missing Values</span>
                    <span className="font-mono-numbers text-slate-200">{report.overall_summary.missing_values}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans">Relational Violations</span>
                    <span className="font-mono-numbers text-slate-200">{report.overall_summary.invalid_relationships}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4 mt-6">
                <button 
                  onClick={loadReport} 
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Quality Audit
                </button>
              </div>
            </div>
          </div>

          {/* Validation Rules Checklist */}
          <div className="md:col-span-2 space-y-4">
            <div className="glass-card p-6 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Data Integrity Checklist</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.overall_summary.gps_valid)}
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">GPS Coordinates Validation</span>
                      <span className="text-[10px] text-slate-500 font-sans">Latitudes (-90 to 90) and Longitudes (-180 to 180) boundaries</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {report.overall_summary.gps_valid ? 'Valid bounds' : 'Out of bounds'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.overall_summary.sampling_consistency.includes("Consistent"))}
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Sampling Frequency Check</span>
                      <span className="text-[10px] text-slate-500 font-sans">Verifying uniform time differences in sequential points</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {report.overall_summary.sampling_consistency}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.relationships.orphaned_telemetry_trips === 0)}
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Relational Integrity</span>
                      <span className="text-[10px] text-slate-500 font-sans">Telemetry Trip_ID references matching existing master Trips</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {report.relationships.orphaned_telemetry_trips === 0 ? 'Referenced' : `${report.relationships.orphaned_telemetry_trips} orphaned`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.relationships.trips_with_multiple_drivers === 0 && report.relationships.trips_with_multiple_vehicles === 0)}
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Single Operator Constraint</span>
                      <span className="text-[10px] text-slate-500 font-sans">Bikes operated by one driver and vehicle per active trip ID</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {report.relationships.trips_with_multiple_drivers === 0 ? 'Unique mappings' : 'Multi-mappings'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
