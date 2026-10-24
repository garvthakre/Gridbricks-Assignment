# UK Wind Power Day-Ahead Procurement & Forecast Risk Portal

> **Client Engagement & Decision Support System for UK Wholesale Electricity Procurement**  
> *Live Deployment:* [Deployed Web App](#live-deployment-links) | *Evaluation Period:* Decisions made in **January 2026** (Delivery: 2 Jan 2026 – 1 Feb 2026)

---

## 1. Executive Summary & Domain Context

An energy utility operating in the Great Britain (GB) power market must procure electricity in the **Day-Ahead Wholesale Auction** (e.g., EPEX SPOT / Nord Pool) to reliably serve consumer demand on delivery day **$D$**.

To minimize expensive peak thermal commitments (CCGT, gas peakers) and avoid severe imbalance cashout penalties:
1. Traders must quantify expected generation from intermittent renewable sources—principally **offshore and onshore wind**.
2. Decisions must be made on day **$D-1$** before the market auction gate closure (typically mid-morning, ~11:00 UTC).
3. Therefore, traders cannot use subsequent forecasts published later in the afternoon or evening of $D-1$; **they must rely strictly on the latest forecast available prior to the $D-1$ decision cutoff**.
4. Furthermore, buying decisions require **quantified forecast error** (MAE, RMSE, systematic bias, and P95 tail risk) so traders can procure the optimal thermal flexibility buffer.

This portal provides an interactive, full-stack decision-support system tailored for the UK utility's wholesale day-ahead trading desk.

---

## 2. Core Business Assumptions & Methodology

| Decision Parameter | Value / Assumption | Rationale & Domain Mapping |
| :--- | :--- | :--- |
| **Decision Window** | **1 Jan 2026 – 31 Jan 2026** | Corresponds to physical delivery dates **2 Jan 2026 – 1 Feb 2026** (as purchases on $D-1$ govern delivery day $D$). |
| **D-1 Auction Cutoff** | **11:00:00 UTC** *(Default, Configurable)* | Standard Day-Ahead Auction Gate Closure (EPEX SPOT UK / Nord Pool). The system strictly filters: `forecast.publish_time <= D-1 11:00:00 UTC`. Alternative presets (09:00 UTC early gate, 10:00 UTC update, 12:00 UTC final) can be toggled interactively in the portal. |
| **Temporal Alignment** | **Half-Hourly Forward-Fill** | `FUELHH` actuals are 30-min settlement periods (48 periods/day). `WINDFOR` forecasts are hourly rate forecasts (MW). Hourly forecasts $[H, H+1)$ are mapped to both half-hourly settlement periods $H:00$ and $H:30$, preserving official BSC settlement period granularity. |
| **Error Convention** | $\text{Error} = \text{Forecast} - \text{Actual}$ | Positive error ($+MW$) indicates **over-forecasting (long bias)**: utility procures too little backup, risking unserved demand/imbalance penalties. Negative error ($-MW$) indicates **under-forecasting (short bias)**: utility procures excess thermal power. |
| **Thermal Reserve Buffer** | **P95 Absolute Error** ($\pm\text{MW}$) | Represents the operational reserve capacity required to cover 95% of day-ahead volume deviations without relying on emergency intraday balancing. |

---

## 3. Key Findings (January 2026 Benchmark)

Across all **1,488 settlement half-hours** in January 2026 at the standard 11:00 UTC $D-1$ gate closure:

* **Mean Absolute Error (MAE)**: `2,016 MW` (average half-hourly prediction variance)
* **Root Mean Square Error (RMSE)**: `2,510 MW` (penalizing large forecast spikes)
* **Systematic Bias**: `+1,730 MW` (**Statistically significant over-forecasting bias**; models systematically over-estimated wind generation in Jan 2026)
* **Mean Absolute Percentage Error (MAPE)**: `21.68%`
* **P90 Absolute Error**: `4,197 MW`
* **P95 Tail Risk Error**: `5,347 MW`
* **Actionable Procurement Recommendation**:
  > *"At the 11:00 UTC D-1 auction cutoff, national wind forecasts exhibit an MAE of 2,016 MW with an over-forecasting bias of +1,730 MW. To hedge 95% of day-ahead renewable volume risk, the trading desk should maintain an operational flexible thermal buffer of **±5,347 MW**."*

---

## 4. Application Architecture

```
┌────────────────────────────────────────────────────────┐
│             React / Next.js 14 Frontend                │
│  - Screen 1: Day-Ahead Purchase Portal (D-1 Cutoff)   │
│  - Screen 2: Forecast Accuracy & Tail Risk Analytics   │
│  - Interactive Recharts, Tailwind CSS, Dark Theme      │
└───────────────────────────▲────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Backend (Python)              │
│  - D-1 Cutoff Filtering Engine                         │
│  - Statistical Metrics: MAE, RMSE, Bias, P90, P95      │
│  - Diurnal & Forecast Horizon Profiling                │
└───────────────────────────▲────────────────────────────┘
                            │ Sub-millisecond indexed SQL
┌───────────────────────────▼────────────────────────────┐
│             Local SQLite Database (Parquet-ready)       │
│  - 1,584 FUELHH Actuals (fuelType = 'WIND')            │
│  - 20,440 WINDFOR Forecasts (Elexon BMRS Streams)      │
└────────────────────────────────────────────────────────┘
```

---

## 5. Directory Structure & File Map

```text
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application, CORS, and REST endpoint routes
│   │   ├── database.py          # SQLite schema, indexing, and connection management
│   │   ├── models.py            # Pydantic data contracts and response schemas
│   │   ├── analytics.py         # D-1 cutoff logic, lead-time math, and error metrics
│   │   └── ingest.py            # Elexon BMRS stream ingestion script (FUELHH & WINDFOR)
│   ├── data/
│   │   └── energy_data.db       # Embedded SQLite DB containing all Jan 2026 records
│   ├── tests/
│   │   └── test_analytics.py    # Pytest test suite (100% pass on cutoff logic & APIs)
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container specification
├── frontend/
│   ├── app/
│   │   ├── layout.jsx           # Next.js root layout with styling
│   │   ├── page.jsx             # Main dashboard container with tab switching
│   │   └── globals.css          # Tailwind CSS definitions
│   ├── components/
│   │   ├── Header.jsx           # Header with UK market status & tab switcher
│   │   ├── DayAheadView.jsx     # Screen 1: D-1 decision forecast vs actuals chart
│   │   ├── AccuracyView.jsx     # Screen 2: Quantitative risk benchmark & curves
│   │   ├── TakeawayCard.jsx     # Plain-language procurement buffer guidance
│   │   └── MetricCard.jsx       # Trading desk KPI widget
│   ├── package.json             # Next.js 14, React 18, Recharts, Tailwind
│   ├── next.config.js           # API proxy rewrites & configuration
│   ├── tailwind.config.js       # Styling configuration
│   └── Dockerfile               # Production Next.js multi-stage container
├── docker-compose.yml           # Unified one-command deployment
├── run_backend.py               # Standalone Python runner script
└── README.md                    # Project documentation & presentation guide
```

---

## 6. How to Run the Application

### Option A: Local Development (Quickstart)

#### 1. Backend (Python 3.10+)
```powershell
# Open terminal in repository root
python -m venv venv
.\venv\Scripts\pip install -r backend\requirements.txt

# Run backend API server
.\venv\Scripts\python run_backend.py
```
*API and Swagger Docs will be available at:* `http://localhost:8000/docs`

#### 2. Run Backend Tests
```powershell
$env:PYTHONPATH="backend"; .\venv\Scripts\python -m pytest backend\tests -v
```

#### 3. Frontend (Node.js 18+)
```powershell
# Open a second terminal in frontend directory
cd frontend
npm install
npm run dev
```
*Web application will be live at:* `http://localhost:3000`

---

### Option B: Docker Compose (One Command)

Ensure Docker Desktop is running, then execute from the repository root:
```bash
docker compose up --build
```
* Access Frontend UI: `http://localhost:3000`
* Access Backend API: `http://localhost:8000/docs`

---

## 7. Live Deployment Links

* **Frontend Web Application (Vercel)**: `https://<YOUR-VERCEL-APP-URL>.vercel.app`
* **Backend API (Render / Heroku)**: `https://<YOUR-BACKEND-URL>.onrender.com/docs`

*(Update the links above upon deploying to your chosen provider).*

---

## 8. Video Presentation Guide (Max 10 Minutes)

The submission video is structured into two 5-minute parts:

### Part 1: Client Pitch (Trading Desk Lead) – ~5 minutes
* **Hook & Business Context (0:00 - 1:00)**: Explain the utility's day-ahead challenge: buying power on $D-1$ to balance demand against weather-dependent wind generation.
* **The Decision Problem (1:00 - 2:00)**: Walk through Screen 1 ("What do I know before I buy?"). Demonstrate picking a delivery date (e.g., Jan 15, 2026), selecting the 11:00 UTC D-1 cutoff gate, and showing how the tool only displays actionable forecasts locked in before the gate closure.
* **Quantified Risk & Operational Takeaway (2:00 - 4:00)**: Switch to Screen 2 ("Forecast Accuracy & Risk"). Highlight the systematic over-forecasting bias (+1,730 MW) and explain the plain-language procurement takeaway: maintaining a $\pm 5,347\text{ MW}$ thermal buffer hedges 95% of imbalance volume risk.
* **Client Value Proposition (4:00 - 5:00)**: Summarize how this pilot prevents costly balancing mechanism cashout charges and optimizes thermal plant dispatch.

### Part 2: Technical Review (Internal Tech Lead) – ~5 minutes
* **Architecture Overview (5:00 - 6:00)**: Walk through the Python FastAPI + Next.js stack, local SQLite indexing, and Docker Compose setup.
* **Cutoff & Alignment Logic (6:00 - 7:30)**: Show `backend/app/analytics.py` and explain:
  - Exact SQL query ensuring `publish_time <= D-1 Cutoff`.
  - Half-hourly alignment of 30-min actuals with hourly WINDFOR forecasts.
* **Code Quality & Testing (7:30 - 8:45)**: Run `pytest` showing 100% test pass, including the test asserting that post-cutoff forecasts are strictly discarded.
* **Production Readiness & Tradeoffs (8:45 - 10:00)**: Discuss deployment on Vercel/Docker, offline dataset caching for zero external downtime, and scalability extensions (e.g. adding solar, regional DNO granularity).

---

## 9. AI Tools Disclosure

In compliance with the assignment instructions, AI tools were utilized to assist in building this application:
* **Google DeepMind Antigravity AI**: Assisted in rapid architectural design, Elexon BMRS API exploration, cutoff verification unit tests, and Next.js / Tailwind component scaffolding.
* All business logic, cutoff filtering calculations, data alignment formulas, and code implementations were reviewed, verified, and tested against live Elexon datasets.
