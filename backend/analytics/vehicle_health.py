import numpy as np
import pandas as pd

def analyze_vehicle_health(df_telemetry: pd.DataFrame, df_trips: pd.DataFrame, df_vehicles: pd.DataFrame) -> tuple:
    """
    Computes vehicle health metrics, anomaly persistence, health scoring, and statuses.
    Returns:
      (df_vehicles_metrics, df_driver_vehicle_associations, vehicle_explanations)
    """
    df_tel = df_telemetry.copy()
    
    # 1. Accel Z deviation: abs(Accel_Z_g - 1.0)
    df_tel['Accel_Z_dev'] = (df_tel['Accel_Z_g'] - 1.0).abs()
    
    # 2. Gyro XY magnitude: sqrt(Gyro_X_dps^2 + Gyro_Y_dps^2)
    df_tel['Gyro_XY_mag'] = np.sqrt(df_tel['Gyro_X_dps']**2 + df_tel['Gyro_Y_dps']**2)
    
    # 3. Gyro Z spikes: abs(Gyro_Z_dps) > mean + 3 * std
    mean_gz = df_tel['Gyro_Z_dps'].mean()
    std_gz = df_tel['Gyro_Z_dps'].std()
    gyro_z_threshold = mean_gz + 3.0 * std_gz if pd.notna(std_gz) and std_gz > 0 else 10.0
    df_tel['Gyro_Z_spike'] = df_tel['Gyro_Z_dps'].abs() > gyro_z_threshold
    
    # 4. Persistence across trips
    # We calculate trip-level mean Accel_Z_dev
    trip_metrics = df_tel.groupby(['Vehicle_ID', 'Trip_ID']).agg(
        mean_accel_z_dev=('Accel_Z_dev', 'mean')
    ).reset_index()
    
    # Trip is abnormal if mean_accel_z_dev > 75th percentile of all trips
    p75_accel_z = trip_metrics['mean_accel_z_dev'].quantile(0.75) if len(trip_metrics) > 0 else 0.05
    trip_metrics['is_abnormal'] = trip_metrics['mean_accel_z_dev'] > p75_accel_z
    
    # Aggregate persistence per vehicle
    vehicle_persistence = trip_metrics.groupby('Vehicle_ID').agg(
        abnormal_trips=('is_abnormal', 'sum'),
        total_trips=('Trip_ID', 'count')
    ).reset_index()
    
    vehicle_persistence['persistence_rate'] = vehicle_persistence['abnormal_trips'] / np.where(
        vehicle_persistence['total_trips'] == 0, 1, vehicle_persistence['total_trips']
    )
    
    # 5. Core Vehicle Aggregation
    vehicle_agg = df_tel.groupby('Vehicle_ID').agg(
        trips=('Trip_ID', 'nunique'),
        drivers=('Driver_ID', 'nunique'),
        telemetry_points=('Timestamp', 'count'),
        mean_accel_z_dev=('Accel_Z_dev', 'mean'),
        p95_accel_z_dev=('Accel_Z_dev', lambda x: x.quantile(0.95)),
        mean_gyro_xy=('Gyro_XY_mag', 'mean'),
        p95_gyro_xy=('Gyro_XY_mag', lambda x: x.quantile(0.95)),
        gyro_z_spike_count=('Gyro_Z_spike', 'sum'),
        distance_km=('Distance_KM', 'sum')
    ).reset_index()
    
    vehicle_agg['gyro_z_spike_rate'] = vehicle_agg['gyro_z_spike_count'] / np.where(
        vehicle_agg['telemetry_points'] == 0, 1, vehicle_agg['telemetry_points']
    )
    
    # Merge persistence
    vehicle_agg = vehicle_agg.merge(vehicle_persistence[['Vehicle_ID', 'persistence_rate']], on='Vehicle_ID', how='left')
    vehicle_agg['persistence_rate'] = vehicle_agg['persistence_rate'].fillna(0.0)
    
    # 6. Normalize and Score
    def min_max_norm(series):
        s_min = series.min()
        s_max = series.max()
        if s_max == s_min:
            return series * 0.0
        return (series - s_min) / (s_max - s_min)
        
    vehicle_agg['norm_accel_z'] = min_max_norm(vehicle_agg['mean_accel_z_dev'])
    vehicle_agg['norm_gyro_xy'] = min_max_norm(vehicle_agg['mean_gyro_xy'])
    vehicle_agg['norm_gyro_z_spike'] = min_max_norm(vehicle_agg['gyro_z_spike_rate'])
    vehicle_agg['norm_persistence'] = min_max_norm(vehicle_agg['persistence_rate'])
    
    # Health Score Formula (100 is healthiest, 0 is worst)
    vehicle_agg['concern_index'] = (
        0.30 * vehicle_agg['norm_accel_z'] +
        0.30 * vehicle_agg['norm_gyro_xy'] +
        0.20 * vehicle_agg['norm_gyro_z_spike'] +
        0.20 * vehicle_agg['norm_persistence']
    )
    
    vehicle_agg['Health_Score'] = (1.0 - vehicle_agg['concern_index']) * 100.0
    vehicle_agg['Health_Score'] = vehicle_agg['Health_Score'].round(1)
    
    # Vehicle Status Mapping
    # Healthy (80-100), Monitor (60-80), Inspection Recommended (40-60), High Maintenance Concern (0-40)
    def get_health_status(score):
        if score >= 80.0:
            return "Healthy"
        elif score >= 60.0:
            return "Monitor"
        elif score >= 40.0:
            return "Inspection Recommended"
        else:
            return "High Maintenance Concern"
            
    vehicle_agg['Health_Status'] = vehicle_agg['Health_Score'].apply(get_health_status)
    
    # Merge with Master Vehicle info
    df_vehicles_metrics = df_vehicles.merge(vehicle_agg, on='Vehicle_ID', how='left')
    
    # Fill defaults
    num_cols = ['trips', 'drivers', 'telemetry_points', 'mean_accel_z_dev', 'p95_accel_z_dev',
                'mean_gyro_xy', 'p95_gyro_xy', 'gyro_z_spike_count', 'gyro_z_spike_rate',
                'distance_km', 'persistence_rate', 'Health_Score']
    for col in num_cols:
        df_vehicles_metrics[col] = df_vehicles_metrics[col].fillna(0)
    df_vehicles_metrics['Health_Status'] = df_vehicles_metrics['Health_Status'].fillna("Healthy")
    
    # 7. Driver-Vehicle mapping
    driver_vehicle_assoc = df_tel.groupby(['Vehicle_ID', 'Driver_ID']).agg(
        trips=('Trip_ID', 'nunique'),
        telemetry_points=('Timestamp', 'count'),
        distance_km=('Distance_KM', 'sum')
    ).reset_index()
    
    return df_vehicles_metrics, driver_vehicle_assoc
