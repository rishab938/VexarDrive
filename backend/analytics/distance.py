import numpy as np
import pandas as pd

def haversine(lat1, lon1, lat2, lon2):
    """
    Computes the great circle distance (in km) between pairs of coordinates
    using the Haversine formula. Supports numpy arrays or scalar numbers.
    """
    R = 6371.0 # Earth's radius in kilometers
    
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    
    a = (np.sin(dlat / 2.0)**2 + 
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0)**2)
         
    c = 2.0 * np.arcsin(np.sqrt(a))
    return R * c

def calculate_telemetry_distances(df_telemetry: pd.DataFrame) -> pd.DataFrame:
    """
    Computes consecutive distance between sequential points within each Trip_ID.
    Mutates/returns the dataframe with a 'Distance_KM' column added.
    """
    df = df_telemetry.copy()
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    df = df.sort_values(by=['Trip_ID', 'Timestamp'])
    
    distances = []
    for trip_id, group in df.groupby('Trip_ID'):
        group = group.sort_values('Timestamp')
        lats = group['Latitude'].values
        lons = group['Longitude'].values
        if len(lats) > 1:
            trip_dists = haversine(lats[:-1], lons[:-1], lats[1:], lons[1:])
            # Prepend a 0 for the first telemetry record of this trip
            distances.extend([0.0] + list(trip_dists))
        else:
            distances.append(0.0)
            
    df['Distance_KM'] = distances
    return df

def aggregate_distances(df_telemetry: pd.DataFrame) -> tuple:
    """
    Returns dictionaries of accumulated distances by:
    (trip_distances, driver_distances, vehicle_distances, total_fleet_distance)
    """
    if 'Distance_KM' not in df_telemetry.columns:
        df_telemetry = calculate_telemetry_distances(df_telemetry)
        
    trip_dists = df_telemetry.groupby('Trip_ID')['Distance_KM'].sum().to_dict()
    driver_dists = df_telemetry.groupby('Driver_ID')['Distance_KM'].sum().to_dict()
    vehicle_dists = df_telemetry.groupby('Vehicle_ID')['Distance_KM'].sum().to_dict()
    total_fleet_dist = float(df_telemetry['Distance_KM'].sum())
    
    return trip_dists, driver_dists, vehicle_dists, total_fleet_dist
