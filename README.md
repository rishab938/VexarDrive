# VexarDrive Fleet Intelligence Dashboard

A production-ready full-stack fleet analytics and operations intelligence platform designed to ingest high-frequency telemetry logs from delivery vehicles, evaluate driver behaviors, detect chassis sensor anomalies, and present actionable risk ratings through a premium glassmorphic user interface.

## Architecture

The application is structured into two main components:
1. **Backend (Python & FastAPI):** Implements data parsing, validation, Haversine GPS calculations, safety thresholds derivation, scoring models, and REST endpoints.
2. **Frontend (React, TypeScript, Tailwind CSS v4, Recharts):** Implements reusable layouts, filters, sorting, metric traceability, and side-panel drill-downs.

```
vexardrive/
│
├── backend/
│   ├── main.py                     # FastAPI server entry point
│   ├── services/
│   │   └── explanation.py          # LLM completions (Groq/OpenAI) and fallbacks
│   └── analytics/
│       ├── ingestion.py            # CSV / XLSX skipped header and column parsers
│       ├── validation.py           # Relational integrity and GPS validators
│       ├── distance.py             # Haversine distance calculator
│       ├── driver_behavior.py      # Dynamic thresholds & Driver risk scores
│       └── vehicle_health.py       # Chassis anomalies & Vehicle health scores
│
├── frontend/
│   ├── src/
│   │   ├── charts/                 # Histogram, Bar, and Bubble scatter charts
│   │   ├── components/             # Reusable KPI card, sortable tables, and modals
│   │   ├── pages/                  # Main tabs pages (Driver, Vehicle, Math, Quality)
│   │   ├── services/               # Fetch API wrapper
│   │   ├── App.tsx                 # Main layout and theme switcher
│   │   ├── index.css               # Global glassmorphic design systems
│   │   └── types.ts                # TypeScript interfaces
│   ├── tsconfig.app.json           # Type options configuration
│   └── vite.config.ts              # Bundler and Tailwind v4 config
│
├── data/                           # Ingested datasets (CSV and XLSX)
├── requirements.txt                # Python backend dependencies
└── .env                            # Groq / OpenAI API Keys
```

---

## Analytics Methodology

### 1. Ingestion & Validation
The backend skips metadata headers automatically and checks fields for:
- Missing values, duplicates, and invalid timestamps.
- GPS coordinate boundaries and negative speed filters.
- Relational constraints (e.g. orphans, or trips mapped to multiple drivers/vehicles).

### 2. GPS Distance Calculation
Consecutive distance is calculated within each trip sorted by timestamp using the **Haversine formula**:
$$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
where $R = 6371.0\text{ km}$. Distance is aggregated per trip, driver, vehicle, and fleet.

### 3. Safety Event Thresholds
IMU thresholds are derived dynamically from telemetry distribution using the **2.5x IQR method** to calibrate to different frames and terrains:
- **Sudden Acceleration:** $\text{Accel\_X\_g} > +0.252\text{ g}$
- **Hard Braking:** $\text{Accel\_X\_g} < -0.252\text{ g}$
- **Sharp Lateral:** $\text{abs(Accel\_Y\_g)} > 0.2375\text{ g}$
- **Sharp Turn:** $\text{abs(Gyro\_Z\_dps)} > 8.4525\text{ dps}$
- **High Speed:** $\text{Speed\_kmph} > 41.8\text{ km/h}$ (95th percentile)

### 4. Driver Risk Score (0-100)
Calculated using min-max normalization across all drivers in the fleet:
$$\text{Risk Score} = (0.35 \cdot \text{norm\_risk\_density} + 0.20 \cdot \text{norm\_braking} + 0.15 \cdot \text{norm\_acceleration} + 0.15 \cdot \text{norm\_turning} + 0.15 \cdot \text{norm\_risky\_trips}) \times 100$$
Safety categories: Safe (0-20), Safe (21-45), Moderate (46-70), High (71-90), Critical (91-100).

### 5. Vehicle Health Score (0-100)
A score of 100 is healthiest, and 0 is worst. Measures mechanical frame shocks:
- **Accel-Z shock deviation:** $\text{abs(Accel\_Z\_g} - 1.0\text{)}$
- **Gyro XY magnitude:** $\sqrt{\text{Gyro\_X}^2 + \text{Gyro\_Y}^2}$
- **Gyro-Z spike rate:** $\text{abs(Gyro\_Z)} > \text{mean} + 3 \cdot \text{std}$
- **Persistence:** Percentage of trips with anomalies exceeding the 75th percentile of the fleet.
$$\text{Concern Index} = 0.30 \cdot \text{norm\_accel\_z} + 0.30 \cdot \text{norm\_gyro\_xy} + 0.20 \cdot \text{norm\_gyro\_z\_spike} + 0.20 \cdot \text{norm\_persistence}$$
$$\text{Health Score} = (1.0 - \text{concern\_index}) \times 100$$

### 6. Driver vs. Vehicle Causation Analysis
- If a vehicle has sensor concerns across multiple drivers, it flags: **Pattern appears vehicle-associated.** (Chassis / sensor concern).
- If a driver has violations across multiple vehicles, it flags: **Pattern may be driver-associated.** (Aggressive driving style).

---

## API Endpoints

- `POST /api/upload`: Upload CSV or Excel files.
- `GET /api/data-quality`: Returns data validation reports.
- `GET /api/overview`: Returns KPI statistics for dashboard cards.
- `GET /api/drivers`: Returns driver risk leaderboard list.
- `GET /api/drivers/{driver_id}`: Returns driver metrics, trip logs, and vehicles used.
- `GET /api/drivers/{driver_id}/explanation`: Returns score justification text.
- `GET /api/vehicles`: Returns vehicle health leaderboard list.
- `GET /api/vehicles/{vehicle_id}`: Returns vehicle metrics, trip logs, and drivers.
- `GET /api/vehicles/{vehicle_id}/explanation`: Returns vehicle anomaly details.
- `GET /api/events`: Returns aggregates of safety events counts.
- `GET /api/methodology`: Returns transparent math parameters and weights.

---

## Installation & Running Locally

### Prerequisites
- Python 3.8 or higher
- Node.js 18 or higher (with npm)

### 1. Setup Backend
1. In the root directory, install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up API keys in a `.env` file (copied from `.env.example`):
   ```env
   GROQ_API_KEY=your_groq_api_key
   ```
3. Run the FastAPI development server:
   ```bash
   uvicorn backend.main:app --port 8000
   ```

### 2. Setup Frontend
1. Open a new terminal in the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard in your browser at `http://localhost:5173`.

### 3. Running Tests
Verify computations and API responses using local tests:
- **Run Calculations validation:** `python backend/analytics/run_pipeline_test.py`
- **Run HTTP Endpoints validation:** `python C:\Users\Rishab\.gemini\antigravity-ide\brain\e01397c2-28c6-496c-b930-25fd334aaa3e\scratch\test_api.py`

---

## Limitations & Future Extensions
- **Sampling Gaps:** Telemetry coordinates are recorded at 1-minute intervals. Higher resolution (e.g. 1Hz or 10Hz) would yield more precise braking/accel event detection.
- **Road Slopes:** Acceleration anomalies include slope elevation changes. Filtering road topography can improve suspension decay detection.
- **Real-time Streaming:** Extending the FastAPI layer to accept WebSockets streams will enable live vehicle tracking and geofencing triggers.
