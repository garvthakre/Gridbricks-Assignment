import sys
import re
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse

# Ensure app is in path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import (
    DayForecastResponse,
    AccuracySummary,
    DiurnalPoint,
    LeadTimePoint,
    DailyAccuracyPoint,
)
from app.analytics import (
    get_day_forecast_and_actuals,
    calculate_month_accuracy,
)
from app.database import init_db

# Initialize database schema on startup
init_db()

app = FastAPI(
    title="UK Wind Day-Ahead Decision & Accuracy API",
    description="Backend API serving Elexon FUELHH actuals vs WINDFOR decision-time forecasts for UK day-ahead power procurement.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def normalize_slashes(request: Request, call_next):
    # Normalize duplicate consecutive slashes in the path (e.g. //api/dates -> /api/dates)
    if "//" in request.url.path:
        clean_path = re.sub(r"/+", "/", request.url.path)
        request.scope["path"] = clean_path
    return await call_next(request)

@app.get("/")
def root():
    return RedirectResponse(url="/docs")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "uk-wind-procurement-api"}

@app.get("/api/dates")
def get_available_dates():
    """
    Returns available delivery dates and recommended cutoff presets.
    """
    # January 2026 purchase window corresponds to delivery dates Jan 2 to Feb 1
    dates = [f"2026-01-{d:02d}" for d in range(2, 32)] + ["2026-02-01"]
    cutoffs = [
        {"label": "09:00 UTC (Early Auction Gate)", "value": "09:00:00"},
        {"label": "10:00 UTC (Mid-Morning Update)", "value": "10:00:00"},
        {"label": "11:00 UTC (Standard EPEX/NordPool Gate)", "value": "11:00:00"},
        {"label": "12:00 UTC (Final Day-Ahead Cutoff)", "value": "12:00:00"},
    ]
    return {
        "dates": dates,
        "default_date": "2026-01-15",
        "cutoffs": cutoffs,
        "default_cutoff": "11:00:00"
    }

@app.get("/api/forecast/day", response_model=DayForecastResponse)
def get_day_forecast(
    delivery_date: str = Query("2026-01-15", description="Delivery date in YYYY-MM-DD"),
    cutoff_time: str = Query("11:00:00", description="D-1 auction cutoff time in HH:MM:SS")
):
    """
    Retrieve all half-hourly settlement periods for the given delivery date,
    overlaying actuals with the latest forecast published before D-1 cutoff.
    """
    try:
        return get_day_forecast_and_actuals(delivery_date=delivery_date, cutoff_time=cutoff_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accuracy/summary", response_model=AccuracySummary)
def get_accuracy_summary(
    start_date: str = Query("2026-01-02", description="Start delivery date YYYY-MM-DD"),
    end_date: str = Query("2026-02-01", description="End delivery date YYYY-MM-DD"),
    cutoff_time: str = Query("11:00:00", description="D-1 cutoff time HH:MM:SS")
):
    """
    Aggregate forecast accuracy metrics (MAE, RMSE, Bias, MAPE, P90, P95, Buffer)
    across the entire evaluation window.
    """
    try:
        summary, _, _, _ = calculate_month_accuracy(
            start_date=start_date, end_date=end_date, cutoff_time=cutoff_time
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accuracy/diurnal", response_model=List[DiurnalPoint])
def get_diurnal_accuracy(
    start_date: str = Query("2026-01-02"),
    end_date: str = Query("2026-02-01"),
    cutoff_time: str = Query("11:00:00")
):
    """
    Forecast error distribution by hour of the day (0 to 23).
    """
    try:
        _, diurnal, _, _ = calculate_month_accuracy(
            start_date=start_date, end_date=end_date, cutoff_time=cutoff_time
        )
        return diurnal
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accuracy/lead-time", response_model=List[LeadTimePoint])
def get_lead_time_accuracy(
    start_date: str = Query("2026-01-02"),
    end_date: str = Query("2026-02-01"),
    cutoff_time: str = Query("11:00:00")
):
    """
    Forecast error as a function of forecast lead time (horizon).
    """
    try:
        _, _, lead_times, _ = calculate_month_accuracy(
            start_date=start_date, end_date=end_date, cutoff_time=cutoff_time
        )
        return lead_times
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accuracy/daily", response_model=List[DailyAccuracyPoint])
def get_daily_accuracy(
    start_date: str = Query("2026-01-02"),
    end_date: str = Query("2026-02-01"),
    cutoff_time: str = Query("11:00:00")
):
    """
    Daily MAE, RMSE, and bias across the month.
    """
    try:
        _, _, _, daily = calculate_month_accuracy(
            start_date=start_date, end_date=end_date, cutoff_time=cutoff_time
        )
        return daily
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
