export interface DataQualitySummary {
  rows_analyzed: number;
  missing_values: number;
  duplicate_records: number;
  invalid_relationships: number;
  gps_valid: boolean;
  sampling_consistency: string;
}

export interface DataQualityReport {
  overall_summary: DataQualitySummary;
  telemetry: Record<string, any>;
  trips: Record<string, any>;
  drivers: Record<string, any>;
  vehicles: Record<string, any>;
  relationships: Record<string, any>;
}

export interface OverviewMetrics {
  total_drivers: number;
  total_trips: number;
  total_distance: number;
  avg_risk_score: number;
  high_risk_drivers: number;
  total_vehicles: number;
  avg_health_score: number;
  vehicles_requiring_inspection: number;
}

export interface DriverRow {
  Driver_ID: string;
  Driver_Name: string;
  Age: number;
  Gender: string;
  License_Experience_Years: number;
  Date_Joined_Fleet: string;
  Primary_Vehicle_ID: string;
  Home_Hub: string;
  trips: number;
  distance: number;
  total_risk_events: number;
  hard_braking_events: number;
  sudden_acceleration_events: number;
  sharp_turn_events: number;
  sharp_lateral_events: number;
  high_speed_events: number;
  risky_trips: number;
  risk_events_per_km: number;
  pct_risky_trips: number;
  Risk_Score: number;
  Risk_Category: string;
}

export interface VehicleRow {
  Vehicle_ID: string;
  Vehicle_Type: string;
  Make: string;
  Model: string;
  Manufacture_Year: number;
  Registration_Date: string;
  Odometer_KM_Start_of_Week: number;
  Last_Service_Date: string;
  trips: number;
  drivers: number;
  telemetry_points: number;
  mean_accel_z_dev: number;
  p95_accel_z_dev: number;
  mean_gyro_xy: number;
  p95_gyro_xy: number;
  gyro_z_spike_count: number;
  gyro_z_spike_rate: number;
  distance_km: number;
  persistence_rate: number;
  Health_Score: number;
  Health_Status: string;
}

export interface TripRow {
  Trip_ID: string;
  Driver_ID: string;
  Vehicle_ID: string;
  Trip_Date: string;
  Start_Time: string;
  End_Time: string;
  Duration_Min: number;
  Distance_KM: number;
  Avg_Speed_kmph: number;
  Max_Speed_kmph: number;
  total_events: number;
  sudden_accel: number;
  hard_braking: number;
  sharp_lateral: number;
  sharp_turn: number;
  high_speed: number;
  Is_Risky: boolean;
}

export interface AssociatedVehicle {
  Vehicle_ID: string;
  Make: string;
  Model: string;
  trips: number;
  distance_km: number;
  Health_Score: number;
  Health_Status: string;
}

export interface AssociatedDriver {
  Driver_ID: string;
  Driver_Name: string;
  trips: number;
  distance_km: number;
  Risk_Score: number;
  Risk_Category: string;
}

export interface DriverDetail {
  metrics: DriverRow;
  trips: TripRow[];
  vehicles: AssociatedVehicle[];
}

export interface VehicleDetail {
  metrics: VehicleRow;
  trips: TripRow[];
  drivers: AssociatedDriver[];
  association_analysis: string;
}

export interface EventsStats {
  counts: {
    high_speed: number;
    sharp_turn: number;
    sudden_accel: number;
    sharp_lateral: number;
    hard_braking: number;
  };
  rates: {
    high_speed: number;
    sharp_turn: number;
    sudden_accel: number;
    sharp_lateral: number;
    hard_braking: number;
  };
  total_records: number;
}

export interface MethodologyDetails {
  driver_weights: Record<string, string>;
  driver_risk_categories: Array<{ range: string; label: string }>;
  vehicle_health_weights: Record<string, string>;
  vehicle_health_status: Array<{ range: string; label: string }>;
  dynamic_thresholds: {
    sudden_accel: number;
    hard_braking: number;
    sharp_lateral: number;
    sharp_turn: number;
    high_speed: number;
  };
}
