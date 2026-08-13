import os
import pandas as pd
import io

def detect_csv_header(file_content: bytes) -> int:
    """
    Scans the first few lines of a CSV to locate the header row containing
    keys like Trip_ID, Driver_ID, or Vehicle_ID. Returns the 0-based row index to skip.
    """
    # Decode contents safely
    try:
        decoded = file_content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded = file_content.decode('latin-1')
        except Exception:
            return 0
            
    lines = decoded.splitlines()
    for idx, line in enumerate(lines[:15]):
        # Check for column names
        parts = [p.strip().lower() for p in line.split(',')]
        if any(key in parts for key in ['trip_id', 'driver_id', 'vehicle_id', 'driver_name', 'vehicle_type']):
            return idx
    return 0

def detect_excel_header(df_raw: pd.DataFrame) -> int:
    """
    Given a raw DataFrame parsed from Excel, scans the first few rows
    to find where the header starts. Returns the number of rows to drop.
    """
    for idx, row in df_raw.head(15).iterrows():
        row_vals = [str(val).strip().lower() for val in row.values if pd.notna(val)]
        if any(key in row_vals for key in ['trip_id', 'driver_id', 'vehicle_id', 'driver_name', 'vehicle_type']):
            return idx
    return 0

def load_csv_data(file_content: bytes) -> pd.DataFrame:
    """
    Loads CSV data from bytes, automatically skipping metadata headers.
    """
    skip_rows = detect_csv_header(file_content)
    # Read CSV
    df = pd.read_csv(io.BytesIO(file_content), skiprows=skip_rows)
    # Clean column names (strip whitespace)
    df.columns = [c.strip() for c in df.columns]
    return df

def load_excel_sheets(file_content: bytes) -> dict:
    """
    Reads an Excel file and returns a dictionary of dataframes keyed by sheet name,
    automatically clean metadata header offsets.
    """
    xl = pd.ExcelFile(io.BytesIO(file_content))
    sheets = {}
    for sheet_name in xl.sheet_names:
        df_raw = pd.read_excel(xl, sheet_name=sheet_name)
        skip_idx = detect_excel_header(df_raw)
        
        # Reload with skipped rows if metadata exists
        if skip_idx > 0:
            df = pd.read_excel(xl, sheet_name=sheet_name, skiprows=skip_idx + 1)
        else:
            df = df_raw
            
        df.columns = [str(c).strip() for c in df.columns]
        sheets[sheet_name] = df
    return sheets

def identify_dataset_type(df: pd.DataFrame) -> str:
    """
    Determines if the DataFrame represents Telemetry, Trips, Drivers, or Vehicles
    based on its columns.
    """
    cols = [c.lower() for c in df.columns]
    if 'timestamp' in cols or ('speed_kmph' in cols and 'accel_x_g' in cols):
        return 'Telemetry'
    if 'trip_date' in cols or ('duration_min' in cols and 'start_latitude' in cols):
        return 'Trips'
    if 'driver_name' in cols or 'license_experience_years' in cols:
        return 'Drivers'
    if 'vehicle_type' in cols or 'odometer_km_start_of_week' in cols or 'make' in cols:
        return 'Vehicles'
    return 'Unknown'
