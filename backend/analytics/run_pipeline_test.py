import os
import pandas as pd
import numpy as np
from ingestion import load_csv_data
from validation import validate_datasets
from distance import calculate_telemetry_distances, aggregate_distances
from driver_behavior import analyze_driver_behavior
from vehicle_health import analyze_vehicle_health

def main():
    # Define paths
    data_dir = r"c:\Users\Rishab\OneDrive\Desktop\Claude\data"
    telemetry_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Telemetry.csv")
    trips_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Trips.csv")
    drivers_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Drivers.csv")
    vehicles_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Vehicles.csv")

    print("=== PHASE 1 & 2: LOADING AND INGESTING DATA ===")
    
    # Helper to load raw bytes
    def load_bytes(path):
        with open(path, 'rb') as f:
            return f.read()
            
    from ingestion import load_csv_data
    df_telemetry = load_csv_data(load_bytes(telemetry_path))
    df_trips = load_csv_data(load_bytes(trips_path))
    df_drivers = load_csv_data(load_bytes(drivers_path))
    df_vehicles = load_csv_data(load_bytes(vehicles_path))
    
    print(f"Ingested rows - Telemetry: {len(df_telemetry)}, Trips: {len(df_trips)}, Drivers: {len(df_drivers)}, Vehicles: {len(df_vehicles)}")
    
    print("\n=== PHASE 1: DATA VALIDATION ===")
    validation_report = validate_datasets(df_telemetry, df_trips, df_drivers, df_vehicles)
    for key, val in validation_report["overall_summary"].items():
        print(f"  {key.replace('_', ' ').capitalize()}: {val}")
    print("  Orphaned telemetry trips:", validation_report["relationships"].get("orphaned_telemetry_trips", 0))
    print("  Trips with multiple drivers:", validation_report["relationships"].get("trips_with_multiple_drivers", 0))
    print("  Trips with multiple vehicles:", validation_report["relationships"].get("trips_with_multiple_vehicles", 0))
    
    print("\n=== PHASE 2: CALCULATING DISTANCE ===")
    df_telemetry = calculate_telemetry_distances(df_telemetry)
    _, _, _, total_fleet_dist = aggregate_distances(df_telemetry)
    print(f"Calculated Fleet Distance: {total_fleet_dist:.3f} km")
    
    print("\n=== PHASE 3: DRIVER BEHAVIOR DETECTION & SCORING ===")
    df_drivers_metrics, df_trips_metrics, thresholds, df_telemetry_flagged = analyze_driver_behavior(
        df_telemetry, df_trips, df_drivers
    )
    
    # Count events
    print("Dynamic thresholds derived:")
    for k, v in thresholds.items():
        print(f"  {k}: {v}")
        
    print("\nEvent counts:")
    print(f"  High Speed: {(df_telemetry_flagged['High_Speed']).sum()}")
    print(f"  Sharp Turn: {(df_telemetry_flagged['Sharp_Turn']).sum()}")
    print(f"  Sudden Acceleration: {(df_telemetry_flagged['Sudden_Accel']).sum()}")
    print(f"  Sharp Lateral: {(df_telemetry_flagged['Sharp_Lateral']).sum()}")
    print(f"  Hard Braking: {(df_telemetry_flagged['Hard_Braking']).sum()}")
    
    print("\n--- FULL DRIVER METRICS AND RISK SCORES TABLE ---")
    cols_driver = ['Driver_ID', 'Driver_Name', 'Risk_Score', 'Risk_Category', 
                   'total_risk_events', 'distance', 'trips', 'risk_events_per_km', 
                   'risky_trips', 'pct_risky_trips']
    df_drivers_print = df_drivers_metrics[cols_driver].sort_values(by='Risk_Score', ascending=False)
    pd.set_option('display.max_columns', 20)
    pd.set_option('display.max_rows', 50)
    pd.set_option('display.width', 1000)
    print(df_drivers_print.to_string(index=False))
    
    print("\n=== PHASE 4: VEHICLE HEALTH ANALYSIS ===")
    df_vehicles_metrics, driver_vehicle_assoc = analyze_vehicle_health(
        df_telemetry_flagged, df_trips_metrics, df_vehicles
    )
    
    print("\n--- FULL VEHICLE METRICS AND HEALTH SCORES TABLE ---")
    cols_vehicle = ['Vehicle_ID', 'Make', 'Model', 'Health_Score', 'Health_Status', 
                    'trips', 'drivers', 'mean_accel_z_dev', 'gyro_z_spike_rate', 'persistence_rate']
    df_vehicles_print = df_vehicles_metrics[cols_vehicle].sort_values(by='Health_Score', ascending=True)
    print(df_vehicles_print.to_string(index=False))

if __name__ == "__main__":
    main()
