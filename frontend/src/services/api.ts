import {
  OverviewMetrics,
  DriverRow,
  DriverDetail,
  VehicleRow,
  VehicleDetail,
  DataQualityReport,
  EventsStats,
  MethodologyDetails
} from '../types';

const API_BASE = 'http://localhost:8000/api';

export async function fetchOverview(): Promise<OverviewMetrics> {
  const res = await fetch(`${API_BASE}/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview KPIs');
  return res.json();
}

export async function fetchDrivers(): Promise<DriverRow[]> {
  const res = await fetch(`${API_BASE}/drivers`);
  if (!res.ok) throw new Error('Failed to fetch drivers data');
  return res.json();
}

export async function fetchDriverDetail(driverId: string): Promise<DriverDetail> {
  const res = await fetch(`${API_BASE}/drivers/${driverId}`);
  if (!res.ok) throw new Error(`Failed to fetch detail for driver ${driverId}`);
  return res.json();
}

export async function fetchDriverExplanation(driverId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/explanation`);
  if (!res.ok) throw new Error(`Failed to fetch explanation for driver ${driverId}`);
  const data = await res.json();
  return data.explanation;
}

export async function fetchVehicles(): Promise<VehicleRow[]> {
  const res = await fetch(`${API_BASE}/vehicles`);
  if (!res.ok) throw new Error('Failed to fetch vehicles data');
  return res.json();
}

export async function fetchVehicleDetail(vehicleId: string): Promise<VehicleDetail> {
  const res = await fetch(`${API_BASE}/vehicles/${vehicleId}`);
  if (!res.ok) throw new Error(`Failed to fetch detail for vehicle ${vehicleId}`);
  return res.json();
}

export async function fetchVehicleExplanation(vehicleId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/explanation`);
  if (!res.ok) throw new Error(`Failed to fetch explanation for vehicle ${vehicleId}`);
  const data = await res.json();
  return data.explanation;
}

export async function fetchDataQuality(): Promise<DataQualityReport> {
  const res = await fetch(`${API_BASE}/data-quality`);
  if (!res.ok) throw new Error('Failed to fetch data quality report');
  return res.json();
}

export async function fetchEventsStats(): Promise<EventsStats> {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error('Failed to fetch safety events data');
  return res.json();
}

export async function fetchMethodology(): Promise<MethodologyDetails> {
  const res = await fetch(`${API_BASE}/methodology`);
  if (!res.ok) throw new Error('Failed to fetch methodology parameters');
  return res.json();
}

export async function uploadDataset(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to upload file');
  }
  return res.json();
}
