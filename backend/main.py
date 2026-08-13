import os
import sys
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Ensure the backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analytics.ingestion import load_csv_data, load_excel_sheets, identify_dataset_type
from analytics.validation import validate_datasets
from analytics.distance import calculate_telemetry_distances, aggregate_distances
from analytics.driver_behavior import analyze_driver_behavior
from analytics.vehicle_health import analyze_vehicle_health
from services.explanation import generate_driver_explanation, generate_vehicle_explanation

load_dotenv()

app = FastAPI(title="VexarDrive Fleet Intelligence API", version="1.0.0")

# CORS middleware to allow connection from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the React app host
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for in-memory cache
DATA_CACHE = {
    "telemetry": None,       # pd.DataFrame
    "trips": None,           # pd.DataFrame
    "drivers": None,         # pd.DataFrame
    "vehicles": None,         # pd.DataFrame
    "drivers_metrics": None, # pd.DataFrame
    "trips_metrics": None,   # pd.DataFrame
    "vehicles_metrics": None,# pd.DataFrame
    "driver_vehicle_assoc": None, # pd.DataFrame
    "validation_report": None, # dict
    "thresholds": None,      # dict
}

# --- Pydantic Schemas ---
class DataQualitySummary(BaseModel):
    rows_analyzed: int
    missing_values: int
    duplicate_records: int
    invalid_relationships: int
    gps_valid: bool
    sampling_consistency: str

class DataQualityReport(BaseModel):
    overall_summary: DataQualitySummary
    telemetry: Dict[str, Any]
    trips: Dict[str, Any]
    drivers: Dict[str, Any]
    vehicles: Dict[str, Any]
    relationships: Dict[str, Any]

class OverviewMetrics(BaseModel):
    total_drivers: int
    total_trips: int
    total_distance: float
    avg_risk_score: float
    high_risk_drivers: int
    total_vehicles: int
    avg_health_score: float
    vehicles_requiring_inspection: int

class DriverRow(BaseModel):
    Driver_ID: str
    Driver_Name: str
    Age: int
    Gender: str
    License_Experience_Years: int
    Date_Joined_Fleet: str
    Primary_Vehicle_ID: str
    Home_Hub: str
    trips: int
    distance: float
    total_risk_events: int
    hard_braking_events: int
    sudden_acceleration_events: int
    sharp_turn_events: int
    sharp_lateral_events: int
    high_speed_events: int
    risky_trips: int
    risk_events_per_km: float
    pct_risky_trips: float
    Risk_Score: float
    Risk_Category: str

class VehicleRow(BaseModel):
    Vehicle_ID: str
    Vehicle_Type: str
    Make: str
    Model: str
    Manufacture_Year: int
    Registration_Date: str
    Odometer_KM_Start_of_Week: int
    Last_Service_Date: str
    trips: int
    drivers: int
    telemetry_points: int
    mean_accel_z_dev: float
    p95_accel_z_dev: float
    mean_gyro_xy: float
    p95_gyro_xy: float
    gyro_z_spike_count: int
    gyro_z_spike_rate: float
    distance_km: float
    persistence_rate: float
    Health_Score: float
    Health_Status: str

class TripRow(BaseModel):
    Trip_ID: str
    Driver_ID: str
    Vehicle_ID: str
    Trip_Date: str
    Start_Time: str
    End_Time: str
    Duration_Min: int
    Distance_KM: float
    Avg_Speed_kmph: float
    Max_Speed_kmph: float
    total_events: int
    sudden_accel: int
    hard_braking: int
    sharp_lateral: int
    sharp_turn: int
    high_speed: int
    Is_Risky: bool

class AssociatedVehicle(BaseModel):
    Vehicle_ID: str
    Make: str
    Model: str
    trips: int
    distance_km: float
    Health_Score: float
    Health_Status: str

class AssociatedDriver(BaseModel):
    Driver_ID: str
    Driver_Name: str
    trips: int
    distance_km: float
    Risk_Score: float
    Risk_Category: str

class ExplanationResponse(BaseModel):
    id: str
    explanation: str

# Helper to run the pipeline
def process_analytical_pipeline():
    global DATA_CACHE
    if (DATA_CACHE["telemetry"] is None or DATA_CACHE["trips"] is None or 
        DATA_CACHE["drivers"] is None or DATA_CACHE["vehicles"] is None):
        return False
        
    print("Processing VexarDrive analytical pipeline...")
    
    # 1. Run validation
    DATA_CACHE["validation_report"] = validate_datasets(
        DATA_CACHE["telemetry"], DATA_CACHE["trips"], 
        DATA_CACHE["drivers"], DATA_CACHE["vehicles"]
    )
    
    # 2. Distance calculations
    DATA_CACHE["telemetry"] = calculate_telemetry_distances(DATA_CACHE["telemetry"])
    
    # 3. Driver behavior and risk scoring
    df_drivers_m, df_trips_m, thresholds, df_tel_flagged = analyze_driver_behavior(
        DATA_CACHE["telemetry"], DATA_CACHE["trips"], DATA_CACHE["drivers"]
    )
    DATA_CACHE["telemetry"] = df_tel_flagged
    DATA_CACHE["drivers_metrics"] = df_drivers_m
    DATA_CACHE["trips_metrics"] = df_trips_m
    DATA_CACHE["thresholds"] = thresholds
    
    # 4. Vehicle health
    df_vehicles_m, driver_vehicle_assoc = analyze_vehicle_health(
        DATA_CACHE["telemetry"], DATA_CACHE["trips_metrics"], DATA_CACHE["vehicles"]
    )
    DATA_CACHE["vehicles_metrics"] = df_vehicles_m
    DATA_CACHE["driver_vehicle_assoc"] = driver_vehicle_assoc
    
    print("Pipeline processing completed successfully!")
    return True

# Startup Event: Auto-load default dataset if it exists in data/
@app.on_event("startup")
def startup_load_data():
    global DATA_CACHE
    data_dir = r"c:\Users\Rishab\OneDrive\Desktop\Claude\data"
    
    # Check if we have extracted CSVs or if we should use the XLSX file
    telemetry_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Telemetry.csv")
    trips_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Trips.csv")
    drivers_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Drivers.csv")
    vehicles_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx - Vehicles.csv")
    
    if (os.path.exists(telemetry_path) and os.path.exists(trips_path) and 
        os.path.exists(drivers_path) and os.path.exists(vehicles_path)):
        print("Default CSV datasets found in data/. Auto-loading...")
        try:
            with open(telemetry_path, 'rb') as f:
                DATA_CACHE["telemetry"] = load_csv_data(f.read())
            with open(trips_path, 'rb') as f:
                DATA_CACHE["trips"] = load_csv_data(f.read())
            with open(drivers_path, 'rb') as f:
                DATA_CACHE["drivers"] = load_csv_data(f.read())
            with open(vehicles_path, 'rb') as f:
                DATA_CACHE["vehicles"] = load_csv_data(f.read())
                
            process_analytical_pipeline()
        except Exception as e:
            print(f"Error loading default CSV datasets: {e}")
            
    else:
        # Check for single XLSX file
        xlsx_path = os.path.join(data_dir, "VEXAR_Fleet_Dataset_CANDIDATE_VERSION.xlsx")
        if os.path.exists(xlsx_path):
            print("Default Excel file found in data/. Auto-loading sheets...")
            try:
                with open(xlsx_path, 'rb') as f:
                    sheets = load_excel_sheets(f.read())
                # Identify sheets
                for sheet_name, df in sheets.items():
                    dtype = identify_dataset_type(df)
                    if dtype == 'Telemetry':
                        DATA_CACHE["telemetry"] = df
                    elif dtype == 'Trips':
                        DATA_CACHE["trips"] = df
                    elif dtype == 'Drivers':
                        DATA_CACHE["drivers"] = df
                    elif dtype == 'Vehicles':
                        DATA_CACHE["vehicles"] = df
                process_analytical_pipeline()
            except Exception as e:
                print(f"Error loading default XLSX file: {e}")

# --- API Endpoints ---

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accepts a CSV or Excel file, loads it, parses sheets,
    identifies content, processes telemetry and updates cache.
    """
    global DATA_CACHE
    content = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = load_csv_data(content)
            dtype = identify_dataset_type(df)
            if dtype == 'Unknown':
                raise HTTPException(status_code=400, detail="Could not identify columns schema in CSV.")
            
            # Map CSV to cache
            if dtype == 'Telemetry':
                DATA_CACHE["telemetry"] = df
            elif dtype == 'Trips':
                DATA_CACHE["trips"] = df
            elif dtype == 'Drivers':
                DATA_CACHE["drivers"] = df
            elif dtype == 'Vehicles':
                DATA_CACHE["vehicles"] = df
                
        elif file.filename.endswith(('.xlsx', '.xls')):
            sheets = load_excel_sheets(content)
            loaded_types = []
            for name, df in sheets.items():
                dtype = identify_dataset_type(df)
                if dtype != 'Unknown':
                    if dtype == 'Telemetry':
                        DATA_CACHE["telemetry"] = df
                    elif dtype == 'Trips':
                        DATA_CACHE["trips"] = df
                    elif dtype == 'Drivers':
                        DATA_CACHE["drivers"] = df
                    elif dtype == 'Vehicles':
                        DATA_CACHE["vehicles"] = df
                    loaded_types.append(f"{name} ({dtype})")
            if not loaded_types:
                raise HTTPException(status_code=400, detail="No recognizable sheets found in Excel file.")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")
            
        # Re-run pipeline if we have all datasets, otherwise process whatever parts are possible
        pipeline_success = process_analytical_pipeline()
        
        return {
            "status": "success",
            "file_name": file.filename,
            "pipeline_processed": pipeline_success,
            "details": {
                "telemetry_rows": len(DATA_CACHE["telemetry"]) if DATA_CACHE["telemetry"] is not None else 0,
                "trips_rows": len(DATA_CACHE["trips"]) if DATA_CACHE["trips"] is not None else 0,
                "drivers_rows": len(DATA_CACHE["drivers"]) if DATA_CACHE["drivers"] is not None else 0,
                "vehicles_rows": len(DATA_CACHE["vehicles"]) if DATA_CACHE["vehicles"] is not None else 0,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")

@app.get("/api/data-quality", response_model=DataQualityReport)
def get_data_quality():
    """
    Returns the validation pipeline data quality report.
    """
    if DATA_CACHE["validation_report"] is None:
        raise HTTPException(status_code=400, detail="No dataset has been uploaded or processed yet.")
    return DATA_CACHE["validation_report"]

@app.get("/api/overview", response_model=OverviewMetrics)
def get_overview():
    """
    Exposes high-level aggregated indicators for driver & vehicle performance dashboards.
    """
    df_drivers = DATA_CACHE["drivers_metrics"]
    df_vehicles = DATA_CACHE["vehicles_metrics"]
    df_trips = DATA_CACHE["trips_metrics"]
    
    if df_drivers is None or df_vehicles is None or df_trips is None:
        raise HTTPException(status_code=400, detail="Data not loaded or processed. Please upload dataset first.")
        
    avg_risk = float(df_drivers['Risk_Score'].mean())
    high_risk_drivers_cnt = int((df_drivers['Risk_Score'] > 70).sum())
    
    avg_health = float(df_vehicles['Health_Score'].mean())
    # Vehicles requiring inspection: Status in ['Inspection Recommended', 'High Maintenance Concern']
    inspect_status = ['Inspection Recommended', 'High Maintenance Concern']
    vehicles_to_inspect = int(df_vehicles['Health_Status'].isin(inspect_status).sum())
    
    total_fleet_distance = float(df_trips['distance_km'].sum())
    
    return {
        "total_drivers": len(df_drivers),
        "total_trips": len(df_trips),
        "total_distance": round(total_fleet_distance, 2),
        "avg_risk_score": round(avg_risk, 1),
        "high_risk_drivers": high_risk_drivers_cnt,
        "total_vehicles": len(df_vehicles),
        "avg_health_score": round(avg_health, 1),
        "vehicles_requiring_inspection": vehicles_to_inspect
    }

@app.get("/api/drivers", response_model=List[DriverRow])
def get_drivers():
    """
    Returns safety analytics metrics for all drivers in the fleet.
    """
    df_drivers = DATA_CACHE["drivers_metrics"]
    if df_drivers is None:
        raise HTTPException(status_code=400, detail="Drivers data not processed.")
    
    # Fill NaN values with safe defaults to ensure JSON serialization
    df_clean = df_drivers.fillna(0)
    return df_clean.to_dict(orient="records")

@app.get("/api/drivers/{driver_id}")
def get_driver_detail(driver_id: str):
    """
    Returns comprehensive metrics for a specific driver, including their trip records,
    and vehicles they have operated.
    """
    df_drivers = DATA_CACHE["drivers_metrics"]
    df_trips = DATA_CACHE["trips_metrics"]
    df_vehicles = DATA_CACHE["vehicles_metrics"]
    assoc = DATA_CACHE["driver_vehicle_assoc"]
    
    if df_drivers is None or df_trips is None:
        raise HTTPException(status_code=400, detail="Data not loaded.")
        
    driver_rows = df_drivers[df_drivers['Driver_ID'] == driver_id]
    if driver_rows.empty:
        raise HTTPException(status_code=404, detail=f"Driver {driver_id} not found.")
        
    driver_data = driver_rows.iloc[0].to_dict()
    
    # Convert NaNs to None/0 for JSON
    for k, v in driver_data.items():
        if pd.isna(v):
            driver_data[k] = 0
            
    # Get associated trips
    driver_trips = df_trips[df_trips['Driver_ID'] == driver_id].copy()
    driver_trips = driver_trips.fillna(0)
    trips_list = driver_trips.to_dict(orient="records")
    
    # Get associated vehicles
    vehicles_list = []
    if assoc is not None and df_vehicles is not None:
        driver_assoc = assoc[assoc['Driver_ID'] == driver_id]
        for _, r in driver_assoc.iterrows():
            v_id = r['Vehicle_ID']
            v_row = df_vehicles[df_vehicles['Vehicle_ID'] == v_id]
            if not v_row.empty:
                v_data = v_row.iloc[0]
                vehicles_list.append({
                    "Vehicle_ID": v_id,
                    "Make": v_data['Make'],
                    "Model": v_data['Model'],
                    "trips": int(r['trips']),
                    "distance_km": round(float(r['distance_km']), 2),
                    "Health_Score": float(v_data['Health_Score']),
                    "Health_Status": v_data['Health_Status']
                })
                
    return {
        "metrics": driver_data,
        "trips": trips_list,
        "vehicles": vehicles_list
    }

@app.get("/api/drivers/{driver_id}/explanation", response_model=ExplanationResponse)
def get_driver_explanation_endpoint(driver_id: str):
    """
    Returns natural language breakdown justification for a driver's risk score.
    """
    df_drivers = DATA_CACHE["drivers_metrics"]
    if df_drivers is None:
        raise HTTPException(status_code=400, detail="Drivers data not processed.")
        
    driver_rows = df_drivers[df_drivers['Driver_ID'] == driver_id]
    if driver_rows.empty:
        raise HTTPException(status_code=404, detail=f"Driver {driver_id} not found.")
        
    row = driver_rows.iloc[0].to_dict()
    explanation_text = generate_driver_explanation(row)
    
    return {
        "id": driver_id,
        "explanation": explanation_text
    }

@app.get("/api/vehicles", response_model=List[VehicleRow])
def get_vehicles():
    """
    Returns health statistics and status summaries for all vehicles in the fleet.
    """
    df_vehicles = DATA_CACHE["vehicles_metrics"]
    if df_vehicles is None:
        raise HTTPException(status_code=400, detail="Vehicles data not processed.")
        
    df_clean = df_vehicles.fillna(0)
    return df_clean.to_dict(orient="records")

@app.get("/api/vehicles/{vehicle_id}")
def get_vehicle_detail(vehicle_id: str):
    """
    Returns comprehensive metrics for a specific vehicle, including associated drivers
    and its operating trips.
    """
    df_vehicles = DATA_CACHE["vehicles_metrics"]
    df_trips = DATA_CACHE["trips_metrics"]
    df_drivers = DATA_CACHE["drivers_metrics"]
    assoc = DATA_CACHE["driver_vehicle_assoc"]
    
    if df_vehicles is None or df_trips is None:
        raise HTTPException(status_code=400, detail="Data not loaded.")
        
    vehicle_rows = df_vehicles[df_vehicles['Vehicle_ID'] == vehicle_id]
    if vehicle_rows.empty:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found.")
        
    vehicle_data = vehicle_rows.iloc[0].to_dict()
    
    # Clean NaNs
    for k, v in vehicle_data.items():
        if pd.isna(v):
            vehicle_data[k] = 0
            
    # Get associated trips
    vehicle_trips = df_trips[df_trips['Vehicle_ID'] == vehicle_id].copy()
    vehicle_trips = vehicle_trips.fillna(0)
    trips_list = vehicle_trips.to_dict(orient="records")
    
    # Get associated drivers
    drivers_list = []
    if assoc is not None and df_drivers is not None:
        vehicle_assoc = assoc[assoc['Vehicle_ID'] == vehicle_id]
        for _, r in vehicle_assoc.iterrows():
            d_id = r['Driver_ID']
            d_row = df_drivers[df_drivers['Driver_ID'] == d_id]
            if not d_row.empty:
                d_data = d_row.iloc[0]
                drivers_list.append({
                    "Driver_ID": d_id,
                    "Driver_Name": d_data['Driver_Name'],
                    "trips": int(r['trips']),
                    "distance_km": round(float(r['distance_km']), 2),
                    "Risk_Score": float(d_data['Risk_Score']),
                    "Risk_Category": d_data['Risk_Category']
                })
                
    # Detect if sensor concerns appear vehicle-associated vs driver-associated
    # If vehicle has concerns across multiple drivers: vehicle-associated
    # If same driver has safety violations across multiple vehicles: driver-associated
    association_message = "Baseline sensor signature. Normal fleet variation."
    is_concerned = vehicle_data['Health_Status'] in ['Inspection Recommended', 'High Maintenance Concern']
    
    if is_concerned:
        if len(drivers_list) > 1:
            association_message = "Pattern appears vehicle-associated. Anomalous vertical or lateral sensor signatures persist across multiple drivers operating this vehicle, pointing to a potential mechanical concern (e.g., suspension, steering alignment, or sensor calibration) rather than driver behavior."
        else:
            # Let's check if the driver who operated it is a high risk driver in general
            if len(drivers_list) == 1:
                dr = drivers_list[0]
                if dr["Risk_Score"] > 70:
                    association_message = "Pattern may be driver-associated. The only operator of this vehicle has a High/Critical safety risk profile. The sensor signatures could stem from aggressive driving habits (harsh cornering or speed bumps) rather than a mechanical issue."
                else:
                    association_message = "Pattern appears vehicle-associated. Even though only one driver operated this vehicle, their general fleet risk profile is safe, suggesting the sensor readings stem from a vehicle concern."
                    
    return {
        "metrics": vehicle_data,
        "trips": trips_list,
        "drivers": drivers_list,
        "association_analysis": association_message
    }

@app.get("/api/vehicles/{vehicle_id}/explanation", response_model=ExplanationResponse)
def get_vehicle_explanation_endpoint(vehicle_id: str):
    """
    Returns natural language breakdown justification for a vehicle's health rating.
    """
    df_vehicles = DATA_CACHE["vehicles_metrics"]
    if df_vehicles is None:
        raise HTTPException(status_code=400, detail="Vehicles data not processed.")
        
    vehicle_rows = df_vehicles[df_vehicles['Vehicle_ID'] == vehicle_id]
    if vehicle_rows.empty:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found.")
        
    row = vehicle_rows.iloc[0].to_dict()
    explanation_text = generate_vehicle_explanation(row)
    
    return {
        "id": vehicle_id,
        "explanation": explanation_text
    }

@app.get("/api/events")
def get_events_stats():
    """
    Returns aggregates and percentages for safety event markers.
    """
    df_tel = DATA_CACHE["telemetry"]
    if df_tel is None:
        raise HTTPException(status_code=400, detail="Telemetry data not processed.")
        
    high_speed = int(df_tel['High_Speed'].sum())
    sharp_turn = int(df_tel['Sharp_Turn'].sum())
    sudden_accel = int(df_tel['Sudden_Accel'].sum())
    sharp_lateral = int(df_tel['Sharp_Lateral'].sum())
    hard_braking = int(df_tel['Hard_Braking'].sum())
    total_records = len(df_tel)
    
    return {
        "counts": {
            "high_speed": high_speed,
            "sharp_turn": sharp_turn,
            "sudden_accel": sudden_accel,
            "sharp_lateral": sharp_lateral,
            "hard_braking": hard_braking,
        },
        "rates": {
            "high_speed": round((high_speed / total_records) * 100, 2),
            "sharp_turn": round((sharp_turn / total_records) * 100, 2),
            "sudden_accel": round((sudden_accel / total_records) * 100, 2),
            "sharp_lateral": round((sharp_lateral / total_records) * 100, 2),
            "hard_braking": round((hard_braking / total_records) * 100, 2),
        },
        "total_records": total_records
    }

@app.get("/api/methodology")
def get_methodology_details():
    """
    Exposes transparent scoring weights and thresholds.
    """
    return {
        "driver_weights": {
            "risk_events_density": "35%",
            "hard_braking": "20%",
            "sudden_acceleration": "15%",
            "sharp_turns": "15%",
            "risky_trips_consistency": "15%"
        },
        "driver_risk_categories": [
            {"range": "0–20", "label": "Very Safe"},
            {"range": "21–45", "label": "Safe"},
            {"range": "46–70", "label": "Moderate Risk"},
            {"range": "71–90", "label": "High Risk"},
            {"range": "91–100", "label": "Critical Risk"}
        ],
        "vehicle_health_weights": {
            "vertical_accel_z_deviation": "30%",
            "rotational_gyro_xy_magnitude": "30%",
            "gyro_z_spike_rate": "20%",
            "anomaly_persistence_across_trips": "20%"
        },
        "vehicle_health_status": [
            {"range": "80–100", "label": "Healthy"},
            {"range": "60–79", "label": "Monitor"},
            {"range": "40–59", "label": "Inspection Recommended"},
            {"range": "0–39", "label": "High Maintenance Concern"}
        ],
        "dynamic_thresholds": DATA_CACHE["thresholds"] if DATA_CACHE["thresholds"] is not None else {
            "sudden_accel": 0.252,
            "hard_braking": -0.252,
            "sharp_lateral": 0.2375,
            "sharp_turn": 8.4525,
            "high_speed": 41.8
        }
    }


