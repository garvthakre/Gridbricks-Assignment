from pydantic import BaseModel
from typing import List, Optional, Dict

class SettlementPoint(BaseModel):
    start_time: str
    settlement_period: int
    actual_mw: Optional[float]
    forecast_mw: Optional[float]
    error_mw: Optional[float]
    abs_error_mw: Optional[float]
    lead_time_hours: Optional[float]
    forecast_publish_time: Optional[str]

class DayForecastResponse(BaseModel):
    delivery_date: str
    cutoff_time: str
    decision_datetime: str
    total_periods: int
    points: List[SettlementPoint]
    day_mae: Optional[float]
    day_rmse: Optional[float]
    day_bias: Optional[float]

class AccuracySummary(BaseModel):
    total_observations: int
    start_date: str
    end_date: str
    cutoff_time: str
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    mape_pct: float
    p50_error_mw: float
    p90_error_mw: float
    p95_error_mw: float
    recommended_buffer_mw: float
    plain_language_takeaway: str

class DiurnalPoint(BaseModel):
    hour_of_day: int
    count: int
    mae_mw: float
    rmse_mw: float
    bias_mw: float

class LeadTimePoint(BaseModel):
    lead_time_bin: str
    lead_time_hours_avg: float
    count: int
    mae_mw: float
    rmse_mw: float
    bias_mw: float

class DailyAccuracyPoint(BaseModel):
    delivery_date: str
    count: int
    mae_mw: float
    rmse_mw: float
    bias_mw: float
