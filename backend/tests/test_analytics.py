import pytest
import sqlite3
import numpy as np
from app.analytics import (
    get_hour_bucket,
    parse_iso,
    get_day_forecast_and_actuals,
    calculate_month_accuracy,
)
from app.main import (
    health_check,
    get_available_dates,
    get_day_forecast,
    get_accuracy_summary,
    get_diurnal_accuracy,
    get_lead_time_accuracy,
    get_daily_accuracy,
)

def test_hour_bucket():
    assert get_hour_bucket("2026-01-05T14:30:00Z") == "2026-01-05T14:00:00Z"
    assert get_hour_bucket("2026-01-05T14:00:00Z") == "2026-01-05T14:00:00Z"
    assert get_hour_bucket("2026-01-05T00:00:00Z") == "2026-01-05T00:00:00Z"

def test_cutoff_logic_filtering():
    """
    Test that cutoff logic strictly ignores forecasts published AFTER cutoff.
    """
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE actuals (
        start_time TEXT PRIMARY KEY,
        settlement_date TEXT NOT NULL,
        settlement_period INTEGER NOT NULL,
        generation REAL NOT NULL,
        publish_time TEXT
    );
    """)
    cursor.execute("""
    CREATE TABLE forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        publish_time TEXT NOT NULL,
        start_time TEXT NOT NULL,
        generation REAL NOT NULL
    );
    """)

    # Target delivery date: 2026-01-10
    # D-1 is 2026-01-09. Cutoff is 11:00:00 -> 2026-01-09T11:00:00Z
    cursor.execute("""
        INSERT INTO actuals VALUES ('2026-01-10T00:00:00Z', '2026-01-10', 1, 10000.0, '2026-01-10T00:30:00Z')
    """)

    # Forecast published at 09:30 (before cutoff) -> 12,000 MW
    cursor.execute("""
        INSERT INTO forecasts (publish_time, start_time, generation)
        VALUES ('2026-01-09T09:30:00Z', '2026-01-10T00:00:00Z', 12000.0)
    """)

    # Forecast published at 14:00 (AFTER cutoff) -> 15,000 MW (MUST BE IGNORED)
    cursor.execute("""
        INSERT INTO forecasts (publish_time, start_time, generation)
        VALUES ('2026-01-09T14:00:00Z', '2026-01-10T00:00:00Z', 15000.0)
    """)
    conn.commit()

    res = get_day_forecast_and_actuals("2026-01-10", cutoff_time="11:00:00", conn=conn)
    assert len(res.points) == 1
    pt = res.points[0]
    # Forecast must be 12,000 MW (from 09:30), NOT 15,000 MW (from 14:00)
    assert pt.forecast_mw == 12000.0
    assert pt.forecast_publish_time == "2026-01-09T09:30:00Z"
    assert pt.actual_mw == 10000.0
    assert pt.error_mw == 2000.0
    conn.close()

def test_api_health_route():
    res = health_check()
    assert res["status"] == "ok"
    assert res["service"] == "uk-wind-procurement-api"

def test_api_dates_route():
    data = get_available_dates()
    assert "dates" in data
    assert "2026-01-15" in data["dates"]
    assert len(data["cutoffs"]) >= 3

def test_api_day_forecast_route():
    data = get_day_forecast(delivery_date="2026-01-15", cutoff_time="11:00:00")
    assert data.delivery_date == "2026-01-15"
    assert len(data.points) == 48
    assert data.day_mae is not None

def test_api_accuracy_summary_route():
    summary = get_accuracy_summary(start_date="2026-01-02", end_date="2026-02-01", cutoff_time="11:00:00")
    assert summary.total_observations > 0
    assert summary.mae_mw > 0
    assert summary.p95_error_mw > 0
    assert summary.recommended_buffer_mw > 0
    assert len(summary.plain_language_takeaway) > 20

def test_api_diurnal_and_lead_time_routes():
    diurnal = get_diurnal_accuracy(start_date="2026-01-02", end_date="2026-02-01", cutoff_time="11:00:00")
    assert len(diurnal) == 24
    lead_times = get_lead_time_accuracy(start_date="2026-01-02", end_date="2026-02-01", cutoff_time="11:00:00")
    assert len(lead_times) > 0
    daily = get_daily_accuracy(start_date="2026-01-02", end_date="2026-02-01", cutoff_time="11:00:00")
    assert len(daily) == 31
