import pandas as pd
import numpy as np

def validate_datasets(df_telemetry: pd.DataFrame, df_trips: pd.DataFrame, 
                      df_drivers: pd.DataFrame, df_vehicles: pd.DataFrame) -> dict:
    """
    Performs comprehensive data validation across telemetry, trips, drivers, and vehicles.
    Returns a dictionary summarizing findings.
    """
    report = {
        "telemetry": {},
        "trips": {},
        "drivers": {},
        "vehicles": {},
        "relationships": {},
        "overall_summary": {
            "rows_analyzed": len(df_telemetry) if df_telemetry is not None else 0,
            "missing_values": 0,
            "duplicate_records": 0,
            "invalid_relationships": 0,
            "gps_valid": True,
            "sampling_consistency": "Consistent"
        }
    }
    
    total_missing = 0
    total_duplicates = 0
    total_invalid_rels = 0
    
    # 1. Telemetry Validation
    if df_telemetry is not None:
        missing = int(df_telemetry.isnull().sum().sum())
        total_missing += missing
        
        # Duplicates
        duplicates = int(df_telemetry.duplicated().sum())
        total_duplicates += duplicates
        
        # Duplicate Trip_ID + Timestamp
        t_key = ['Trip_ID', 'Timestamp']
        if all(c in df_telemetry.columns for c in t_key):
            dup_timestamps = int(df_telemetry.duplicated(subset=t_key).sum())
        else:
            dup_timestamps = 0
            
        # GPS Validity
        gps_errors = 0
        if 'Latitude' in df_telemetry.columns and 'Longitude' in df_telemetry.columns:
            invalid_lat = ((df_telemetry['Latitude'] < -90) | (df_telemetry['Latitude'] > 90)).sum()
            invalid_lon = ((df_telemetry['Longitude'] < -180) | (df_telemetry['Longitude'] > 180)).sum()
            gps_errors = int(invalid_lat + invalid_lon)
            if gps_errors > 0:
                report["overall_summary"]["gps_valid"] = False
                
        # Negative speed
        neg_speed = 0
        if 'Speed_kmph' in df_telemetry.columns:
            neg_speed = int((df_telemetry['Speed_kmph'] < 0).sum())
            
        # Telemetry interval check
        interval_issues = 0
        if 'Timestamp' in df_telemetry.columns and 'Trip_ID' in df_telemetry.columns:
            df_t = df_telemetry.copy()
            df_t['Timestamp'] = pd.to_datetime(df_t['Timestamp'])
            intervals = []
            for _, gp in df_t.groupby('Trip_ID'):
                gp = gp.sort_values('Timestamp')
                if len(gp) > 1:
                    diffs = gp['Timestamp'].diff().dt.total_seconds() / 60.0
                    intervals.extend(diffs.dropna().values)
            if len(intervals) > 0:
                mean_interval = float(np.mean(intervals))
                std_interval = float(np.std(intervals))
                # If std deviation of intervals is large, flag as inconsistent
                if std_interval > 2.0:
                    report["overall_summary"]["sampling_consistency"] = f"Inconsistent (Mean: {mean_interval:.1f}m, Std: {std_interval:.1f}m)"
                else:
                    report["overall_summary"]["sampling_consistency"] = f"Consistent ({mean_interval:.1f}m interval)"
            else:
                report["overall_summary"]["sampling_consistency"] = "Insufficient Data"
                
        report["telemetry"] = {
            "row_count": len(df_telemetry),
            "missing_values": missing,
            "duplicate_records": duplicates,
            "duplicate_timestamps": dup_timestamps,
            "gps_errors": gps_errors,
            "negative_speeds": neg_speed
        }
        
    # 2. Trips Validation
    if df_trips is not None:
        missing = int(df_trips.isnull().sum().sum())
        total_missing += missing
        duplicates = int(df_trips.duplicated().sum())
        total_duplicates += duplicates
        
        report["trips"] = {
            "row_count": len(df_trips),
            "missing_values": missing,
            "duplicate_records": duplicates
        }
        
    # 3. Drivers & Vehicles Validation
    for name, df in [("drivers", df_drivers), ("vehicles", df_vehicles)]:
        if df is not None:
            missing = int(df.isnull().sum().sum())
            total_missing += missing
            duplicates = int(df.duplicated().sum())
            total_duplicates += duplicates
            report[name] = {
                "row_count": len(df),
                "missing_values": missing,
                "duplicate_records": duplicates
            }
            
    # 4. Relational Integrity Checks
    if df_telemetry is not None and df_trips is not None:
        # Invalid IDs in Telemetry
        invalid_trip_ids = int((~df_telemetry['Trip_ID'].isin(df_trips['Trip_ID'])).sum())
        total_invalid_rels += invalid_trip_ids
        
        # Multiple drivers or vehicles per Trip_ID
        trip_drivers = df_telemetry.groupby('Trip_ID')['Driver_ID'].nunique()
        trips_with_multi_drivers = int((trip_drivers > 1).sum())
        
        trip_vehicles = df_telemetry.groupby('Trip_ID')['Vehicle_ID'].nunique()
        trips_with_multi_vehicles = int((trip_vehicles > 1).sum())
        
        report["relationships"] = {
            "orphaned_telemetry_trips": invalid_trip_ids,
            "trips_with_multiple_drivers": trips_with_multi_drivers,
            "trips_with_multiple_vehicles": trips_with_multi_vehicles
        }
        total_invalid_rels += trips_with_multi_drivers + trips_with_multi_vehicles
        
    report["overall_summary"]["missing_values"] = total_missing
    report["overall_summary"]["duplicate_records"] = total_duplicates
    report["overall_summary"]["invalid_relationships"] = total_invalid_rels
    
    return report
