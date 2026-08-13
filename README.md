# VexarDrive Fleet Intelligence Dashboard

A production-ready fleet analytics and operations intelligence platform. Ingests high-frequency telemetry from two-wheeler delivery vehicles, evaluates driver behavior, detects chassis sensor anomalies, and presents risk ratings through a glassmorphic user interface.

> [!IMPORTANT]
> **Core Principle:** All numerical calculations are deterministic and computed in Python. The frontend only displays what the analytics pipeline has already calculated. An optional LLM layer may generate natural-language explanations from verified metrics, but it never computes, adjusts, or invents a score.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Analytics Methodology](#4-analytics-methodology)
   - [4.1 Ingestion and Validation](#41-ingestion-and-validation)
   - [4.2 GPS Distance Calculation](#42-gps-distance-calculation)
   - [4.3 Safety Event Thresholds](#43-safety-event-thresholds)
   - [4.4 Driver Risk Score](#44-driver-risk-score)
   - [4.5 Vehicle Health Score](#45-vehicle-health-score)
   - [4.6 Driver vs Vehicle Causation Analysis](#46-driver-vs-vehicle-causation-analysis)
5. [API Endpoints](#5-api-endpoints)
6. [Installation and Running Locally](#6-installation-and-running-locally)
7. [Testing](#7-testing)
8. [Optional LLM Explanation Layer](#8-optional-llm-explanation-layer)
9. [Limitations](#9-limitations)
10. [Roadmap](#10-roadmap)
11. [License](#11-license)

---

## 1. Overview
VexarDrive Fleet Intelligence ingests one week of two-wheeler delivery fleet telemetry (GPS, speed, accelerometer, gyroscope, sampled once per minute) and produces two dashboards:

* **Driver Behaviour Dashboard:** Identifies which drivers are riding unsafely, and why.
* **Vehicle Health Dashboard:** Identifies which vehicles show abnormal sensor signatures and may need inspection.

Every number shown is backed by a deterministic, reproducible Python calculation, traceable down to the raw telemetry row it came from.

---

## 2. Architecture
Two main components:

### Backend (Python, FastAPI)
* Data parsing (CSV / XLSX)
* Data validation
* Haversine GPS distance calculation
* Dynamic safety threshold derivation
* Driver and vehicle scoring models
* REST API endpoints

### Frontend (React, TypeScript, Tailwind CSS v4, Recharts)
* Reusable layout components
* Filtering and sorting
* Metric lineage / traceability views
* Side-panel drill-downs

```
Processing pipeline:
Upload -> Validate -> Process -> Cache analytical results -> API -> Dashboard
```

Telemetry is joined through Trips to Drivers and Vehicles. Aggregations (trip, driver, vehicle, fleet level) are computed from this joined grain. Telemetry is never pre-aggregated before event detection.

---

## 3. Project Structure
```text
vexardrive/
  backend/
    main.py                     FastAPI server entry point
    services/
      explanation.py            LLM completions (Groq/OpenAI) and fallbacks
    analytics/
      ingestion.py              CSV / XLSX parsers
      validation.py             Relational integrity and GPS validators
      distance.py               Haversine distance calculator
      driver_behavior.py        Dynamic thresholds and driver risk scores
      vehicle_health.py         Chassis anomalies and vehicle health scores
  frontend/
    src/
      charts/                   Histogram, bar, and bubble scatter charts
      components/               KPI cards, sortable tables, modals
      pages/                    Driver, Vehicle, Methodology, Data Quality tabs
      services/                 Fetch API wrapper
      App.tsx                   Main layout and theme switcher
      index.css                 Global glassmorphic design system
      types.ts                  TypeScript interfaces
    tsconfig.app.json
    vite.config.ts              Bundler and Tailwind v4 config
  data/                         Ingested datasets (CSV and XLSX)
  requirements.txt              Python backend dependencies
  .env.example                  Environment variable template
  README.md
```

---

## 4. Analytics Methodology

### 4.1 Ingestion and Validation
The backend automatically skips metadata headers and checks fields for:
* Missing values, duplicate rows, invalid timestamps
* GPS coordinate boundaries and negative-speed filters
* Relational constraints (orphaned records, trips mapped to multiple drivers or vehicles)

Nothing is silently modified. Every cleaning action taken is recorded and surfaced in the Data Quality page.

### 4.2 GPS Distance Calculation
Consecutive distance is calculated within each trip, sorted by timestamp, using the Haversine formula:

$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$

Where $R = 6371.0\text{ km}$. Distance is never calculated across trip boundaries. It is aggregated per trip, driver, vehicle, and fleet.

### 4.3 Safety Event Thresholds
IMU thresholds are derived dynamically from the telemetry distribution using the 2.5x IQR method, so they recalibrate to different fleets and terrains instead of relying on fixed constants.

| Event | Formula | Method |
| :--- | :--- | :--- |
| **Sudden Acceleration** | $\text{Accel\_X\_g} > +0.252\text{ g}$ | 2.5x IQR |
| **Hard Braking** | $\text{Accel\_X\_g} < -0.252\text{ g}$ | 2.5x IQR |
| **Sharp Lateral** | $\text{abs}(\text{Accel\_Y\_g}) > 0.2375\text{ g}$ | 2.5x IQR |
| **Sharp Turn** | $\text{abs}(\text{Gyro\_Z\_dps}) > 8.4525\text{ dps}$ | 2.5x IQR |
| **High Speed** | $\text{Speed\_kmph} > 41.8\text{ km/h}$ | 95th percentile |

### 4.4 Driver Risk Score (0-100)
Calculated using min-max normalization across all drivers in the fleet:

$$\text{Risk Score} = (0.35 \cdot \text{norm\_risk\_density} + 0.20 \cdot \text{norm\_braking} + 0.15 \cdot \text{norm\_acceleration} + 0.15 \cdot \text{norm\_turning} + 0.15 \cdot \text{norm\_risky\_trips}) \times 100$$

| Score Range | Category |
| :--- | :--- |
| **0–20** | Very Safe |
| **21–45** | Safe |
| **46–70** | Moderate Risk |
| **71–90** | High Risk |
| **91–100** | Critical Risk |

### 4.5 Vehicle Health Score (0-100)
100 = healthiest, 0 = highest maintenance concern. Measures mechanical / frame shock signatures only. Never claims a specific mechanical diagnosis.

**Components:**
* **Accel-Z shock deviation:** $\text{abs}(\text{Accel\_Z\_g} - 1.0)$
* **Gyro XY magnitude:** $\sqrt{\text{Gyro\_X}^2 + \text{Gyro\_Y}^2}$
* **Gyro-Z spike rate:** $\text{abs}(\text{Gyro\_Z}) > \text{mean} + 3 \cdot \text{std}$
* **Persistence:** Percent of trips with anomalies exceeding the fleet's 75th percentile

$$\text{Concern Index} = 0.30 \cdot \text{norm\_accel\_z} + 0.30 \cdot \text{norm\_gyro\_xy} + 0.20 \cdot \text{norm\_gyro\_z\_spike} + 0.20 \cdot \text{norm\_persistence}$$

$$\text{Health Score} = (1.0 - \text{Concern Index}) \times 100$$

Vehicle status labels (Healthy, Monitor, Inspection Recommended, High Maintenance Concern) are always phrased as anomaly signals (*"abnormal sensor signature"*, *"inspection recommended"*), never as a claimed mechanical failure.

### 4.6 Driver vs Vehicle Causation Analysis
* If a vehicle shows sensor anomalies across multiple drivers: flag as **"Pattern appears vehicle-associated"** (possible chassis or sensor concern).
* If a driver shows risk events across multiple vehicles: flag as **"Pattern may be driver-associated"** (possible riding-style factor).

Neither flag claims causation. Both are surfaced as patterns worth investigating, not conclusions.

---

## 5. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/upload` | Upload a CSV or Excel telemetry file |
| **GET** | `/api/data-quality` | Data validation report |
| **GET** | `/api/overview` | Fleet-wide KPI statistics |
| **GET** | `/api/drivers` | Driver risk leaderboard |
| **GET** | `/api/drivers/{driver_id}` | Driver metrics, trip logs, vehicles used |
| **GET** | `/api/drivers/{driver_id}/explanation` | Score justification (LLM or template) |
| **GET** | `/api/vehicles` | Vehicle health leaderboard |
| **GET** | `/api/vehicles/{vehicle_id}` | Vehicle metrics, trip logs, drivers |
| **GET** | `/api/vehicles/{vehicle_id}/explanation` | Vehicle anomaly explanation |
| **GET** | `/api/events` | Aggregated safety event counts |
| **GET** | `/api/methodology` | Transparent formulas, thresholds, weights |

All responses are clean, typed JSON via Pydantic models. Raw pandas objects are never exposed through the API.

---

## 6. Installation and Running Locally

### Prerequisites
* Python 3.8 or higher
* Node.js 18 or higher (with npm)

### Step 1: Backend Setup
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` to configure your API keys:
   ```env
   GROQ_API_KEY=your_groq_api_key
   # (or OPENAI_API_KEY=your_openai_api_key)
   ```
   *If no API key is provided, the app falls back to deterministic template explanations. The LLM layer is entirely optional.*
4. Run the FastAPI development server:
   ```bash
   python -m uvicorn backend.main:app --port 8000
   ```

### Step 2: Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the dashboard at `http://localhost:5173`.

### Step 3: Upload Dataset
1. Navigate to the upload screen (Data Quality tab) and provide CSV/XLSX telemetry file(s).
2. The pipeline validates, processes, and caches the analytical results automatically. No values are hard-coded; results reflect whatever dataset is uploaded.

---

## 7. Testing
Validate core analytics calculations (distance, thresholds, scoring):
```bash
python backend/analytics/run_pipeline_test.py
```

Validate API endpoint responses:
```bash
pytest backend/tests/
```

*Test coverage includes: CSV/XLSX ingestion edge cases, Haversine distance correctness, event threshold detection, risk-score normalization and weighting, vehicle anomaly detection, and major API routes.*

---

## 8. Optional LLM Explanation Layer
The LLM layer is strictly a translation step, never a calculation step. It receives already-computed, verified JSON (for example, a driver's score, category, and event counts) and is instructed to:
* Use only the supplied JSON. No invented numbers or new metrics.
* Never diagnose a mechanical failure.
* Never change a score or category.
* State explicitly when evidence is insufficient.

Supported providers are configured via environment variables (`GROQ_API_KEY`, `OPENAI_API_KEY`, or similar). Without a key, the app uses deterministic, template-based explanations. The dashboard is fully functional either way.

---

## 9. Limitations
* **Sampling gaps:** Telemetry is recorded at 1-minute intervals. Higher frequency sampling (1Hz-10Hz) would sharpen braking/acceleration event detection.
* **Road topography:** Acceleration anomalies can include slope-related elevation changes. Filtering for road grade would improve suspension-related anomaly detection.
* **No live streaming:** The current pipeline is batch-oriented (upload -> process -> analyze).

---

## 10. Roadmap
* Real-time telemetry ingestion via WebSockets for live vehicle tracking and geofencing triggers.
* Road-grade correction for acceleration-based anomaly detection.
* Configurable per-fleet threshold profiles (e.g. urban vs highway routes).
* Exportable PDF/CSV fleet reports.

---

## 11. License
Distributed under the MIT License. See `LICENSE` for details.
