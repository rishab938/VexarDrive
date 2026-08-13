import numpy as np
import pandas as pd

def calculate_behavior_thresholds(df_telemetry: pd.DataFrame) -> dict:
    """
    Computes statistical thresholds from the telemetry dataset.
    Uses 2.5x IQR method for IMU columns and 95th percentile for speed.
    """
    if df_telemetry is None or len(df_telemetry) == 0:
        return {
            "sudden_accel": 0.252,
            "hard_braking": -0.252,
            "sharp_lateral": 0.2375,
            "sharp_turn": 8.4525,
            "high_speed": 41.8
        }
        
    # Speed: 95th percentile
    speed_th = float(df_telemetry['Speed_kmph'].quantile(0.95))
    
    # Accel X: 2.5x IQR
    q1_x = df_telemetry['Accel_X_g'].quantile(0.25)
    q3_x = df_telemetry['Accel_X_g'].quantile(0.75)
    iqr_x = q3_x - q1_x
    accel_x_th = float(q3_x + 2.5 * iqr_x)
    
    # Accel Y: 2.5x IQR
    q1_y = df_telemetry['Accel_Y_g'].quantile(0.25)
    q3_y = df_telemetry['Accel_Y_g'].quantile(0.75)
    iqr_y = q3_y - q1_y
    accel_y_th = float(q3_y + 2.5 * iqr_y)
    
    # Gyro Z: 2.5x IQR
    q1_gz = df_telemetry['Gyro_Z_dps'].quantile(0.25)
    q3_gz = df_telemetry['Gyro_Z_dps'].quantile(0.75)
    iqr_gz = q3_gz - q1_gz
    gyro_z_th = float(q3_gz + 2.5 * iqr_gz)
    
    return {
        "sudden_accel": round(accel_x_th, 4),
        "hard_braking": round(-accel_x_th, 4),
        "sharp_lateral": round(accel_y_th, 4),
        "sharp_turn": round(gyro_z_th, 4),
        "high_speed": round(speed_th, 1)
    }

def analyze_driver_behavior(df_telemetry: pd.DataFrame, df_trips: pd.DataFrame, df_drivers: pd.DataFrame) -> tuple:
    """
    Analyzes telemetry data, flags driver events, computes metrics, and scores drivers.
    Returns:
      (df_drivers_metrics, df_trips_metrics, thresholds, df_telemetry_flagged)
    """
    # 1. Calculate dynamic thresholds
    thresholds = calculate_behavior_thresholds(df_telemetry)
    
    # 2. Flag events in telemetry
    df_tel = df_telemetry.copy()
    df_tel['Sudden_Accel'] = df_tel['Accel_X_g'] > thresholds['sudden_accel']
    df_tel['Hard_Braking'] = df_tel['Accel_X_g'] < thresholds['hard_braking']
    df_tel['Sharp_Lateral'] = df_tel['Accel_Y_g'].abs() > thresholds['sharp_lateral']
    df_tel['Sharp_Turn'] = df_tel['Gyro_Z_dps'].abs() > thresholds['sharp_turn']
    df_tel['High_Speed'] = df_tel['Speed_kmph'] > thresholds['high_speed']
    
    df_tel['Risk_Event_Count'] = (
        df_tel['Sudden_Accel'].astype(int) +
        df_tel['Hard_Braking'].astype(int) +
        df_tel['Sharp_Lateral'].astype(int) +
        df_tel['Sharp_Turn'].astype(int) +
        df_tel['High_Speed'].astype(int)
    )
    
    # 3. Aggregate events by Trip_ID
    trip_events = df_tel.groupby('Trip_ID').agg(
        total_events=('Risk_Event_Count', 'sum'),
        sudden_accel=('Sudden_Accel', 'sum'),
        hard_braking=('Hard_Braking', 'sum'),
        sharp_lateral=('Sharp_Lateral', 'sum'),
        sharp_turn=('Sharp_Turn', 'sum'),
        high_speed=('High_Speed', 'sum'),
        distance_km=('Distance_KM', 'sum')
    ).reset_index()
    
    trip_events['Is_Risky'] = trip_events['total_events'] > 0
    
    # Join with trips metadata
    df_trips_metrics = df_trips.merge(trip_events, on='Trip_ID', how='left')
    # Fill any NaNs (if a trip has no telemetry at all)
    fill_cols = ['total_events', 'sudden_accel', 'hard_braking', 'sharp_lateral', 'sharp_turn', 'high_speed', 'distance_km']
    for c in fill_cols:
        df_trips_metrics[c] = df_trips_metrics[c].fillna(0)
    df_trips_metrics['Is_Risky'] = df_trips_metrics['Is_Risky'].fillna(False).astype(bool)
    
    # 4. Aggregate by Driver_ID
    driver_agg = df_trips_metrics.groupby('Driver_ID').agg(
        trips=('Trip_ID', 'count'),
        distance=('distance_km', 'sum'),
        total_risk_events=('total_events', 'sum'),
        hard_braking_events=('hard_braking', 'sum'),
        sudden_acceleration_events=('sudden_accel', 'sum'),
        sharp_turn_events=('sharp_turn', 'sum'),
        sharp_lateral_events=('sharp_lateral', 'sum'),
        high_speed_events=('high_speed', 'sum'),
        risky_trips=('Is_Risky', 'sum')
    ).reset_index()
    
    # Ratios per KM
    # Avoid divide-by-zero by setting distance to epsilon if 0
    dist_safe = np.where(driver_agg['distance'] == 0, 1e-6, driver_agg['distance'])
    driver_agg['risk_events_per_km'] = driver_agg['total_risk_events'] / dist_safe
    driver_agg['hard_braking_per_km'] = driver_agg['hard_braking_events'] / dist_safe
    driver_agg['sudden_accel_per_km'] = driver_agg['sudden_acceleration_events'] / dist_safe
    driver_agg['sharp_turn_per_km'] = driver_agg['sharp_turn_events'] / dist_safe
    
    # Percentage of risky trips
    driver_agg['pct_risky_trips'] = (driver_agg['risky_trips'] / driver_agg['trips']) * 100.0
    
    # 5. Min-Max Normalization
    def min_max_norm(series):
        s_min = series.min()
        s_max = series.max()
        if s_max == s_min:
            return series * 0.0
        return (series - s_min) / (s_max - s_min)
        
    driver_agg['norm_risk_density'] = min_max_norm(driver_agg['risk_events_per_km'])
    driver_agg['norm_braking'] = min_max_norm(driver_agg['hard_braking_per_km'])
    driver_agg['norm_acceleration'] = min_max_norm(driver_agg['sudden_accel_per_km'])
    driver_agg['norm_turning'] = min_max_norm(driver_agg['sharp_turn_per_km'])
    driver_agg['norm_risky_trips'] = min_max_norm(driver_agg['pct_risky_trips'])
    
    # 6. Driver Risk Score (0-100)
    driver_agg['Risk_Score'] = (
        0.35 * driver_agg['norm_risk_density'] +
        0.20 * driver_agg['norm_braking'] +
        0.15 * driver_agg['norm_acceleration'] +
        0.15 * driver_agg['norm_turning'] +
        0.15 * driver_agg['norm_risky_trips']
    ) * 100.0
    
    # Round Risk_Score
    driver_agg['Risk_Score'] = driver_agg['Risk_Score'].round(1)
    
    # Categorization based on Risk Score
    # 0–20 Very Safe, 21–45 Safe, 46–70 Moderate Risk, 71–90 High Risk, 91–100 Critical Risk
    def get_risk_category(score):
        if score <= 20.0:
            return "Very Safe"
        elif score <= 45.0:
            return "Safe"
        elif score <= 70.0:
            return "Moderate Risk"
        elif score <= 90.0:
            return "High Risk"
        else:
            return "Critical Risk"
            
    driver_agg['Risk_Category'] = driver_agg['Risk_Score'].apply(get_risk_category)
    
    # Merge with Master Driver info (Driver_Name, Age, Gender, etc.)
    df_drivers_metrics = df_drivers.merge(driver_agg, on='Driver_ID', how='left')
    
    # Fill any missing metrics (if driver had no trips)
    num_cols = ['trips', 'distance', 'total_risk_events', 'hard_braking_events', 
                'sudden_acceleration_events', 'sharp_turn_events', 'sharp_lateral_events', 
                'risky_trips', 'risk_events_per_km', 'hard_braking_per_km', 
                'sudden_accel_per_km', 'sharp_turn_per_km', 'pct_risky_trips', 'Risk_Score']
    for col in num_cols:
        df_drivers_metrics[col] = df_drivers_metrics[col].fillna(0)
    df_drivers_metrics['Risk_Category'] = df_drivers_metrics['Risk_Category'].fillna("Very Safe")
    
    return df_drivers_metrics, df_trips_metrics, thresholds, df_tel
