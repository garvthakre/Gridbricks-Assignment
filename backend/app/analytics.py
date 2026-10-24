import sqlite3
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Tuple
import numpy as np

from app.database import get_connection
from app.models import (
    SettlementPoint,
    DayForecastResponse,
    AccuracySummary,
    DiurnalPoint,
    LeadTimePoint,
    DailyAccuracyPoint,
)

def parse_iso(dt_str: str) -> datetime:
    """Parse ISO 8601 string into datetime."""
    clean_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(clean_str)

def get_hour_bucket(start_time_iso: str) -> str:
    """
    Map half-hour timestamp to the corresponding hourly forecast timestamp.
    e.g. '2026-01-05T14:30:00Z' -> '2026-01-05T14:00:00Z'
    """
    dt = parse_iso(start_time_iso)
    hour_dt = dt.replace(minute=0, second=0, microsecond=0)
    return hour_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def get_day_forecast_and_actuals(
    delivery_date: str,
    cutoff_time: str = "11:00:00",
    conn: Optional[sqlite3.Connection] = None
) -> DayForecastResponse:
    """
    Retrieve all settlement periods for a delivery date, overlaying
    actual generation with the latest forecast published before the D-1 cutoff.
    """
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        cursor = conn.cursor()

        # Determine D-1 cutoff timestamp
        delivery_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
        d_minus_1 = (delivery_dt - timedelta(days=1)).strftime("%Y-%m-%d")
        cutoff_ts = f"{d_minus_1}T{cutoff_time}Z"

        # Query actuals for the delivery date
        cursor.execute("""
            SELECT start_time, settlement_period, generation
            FROM actuals
            WHERE settlement_date = ?
            ORDER BY settlement_period ASC
        """, (delivery_date,))
        actual_rows = cursor.fetchall()

        points: List[SettlementPoint] = []
        errors: List[float] = []

        for row in actual_rows:
            start_time = row["start_time"]
            period = row["settlement_period"]
            actual_gen = float(row["generation"])

            hour_target = get_hour_bucket(start_time)

            # Find latest forecast published on or before D-1 cutoff
            cursor.execute("""
                SELECT generation, publish_time
                FROM forecasts
                WHERE start_time = ? AND publish_time <= ?
                ORDER BY publish_time DESC
                LIMIT 1
            """, (hour_target, cutoff_ts))
            fc_row = cursor.fetchone()

            if fc_row:
                fc_gen = float(fc_row["generation"])
                pub_time = fc_row["publish_time"]
                err = fc_gen - actual_gen
                abs_err = abs(err)
                errors.append(err)

                # Compute lead time in hours
                target_dt = parse_iso(start_time)
                pub_dt = parse_iso(pub_time)
                lead_time_hrs = round((target_dt - pub_dt).total_seconds() / 3600.0, 1)

                points.append(SettlementPoint(
                    start_time=start_time,
                    settlement_period=period,
                    actual_mw=actual_gen,
                    forecast_mw=fc_gen,
                    error_mw=round(err, 2),
                    abs_error_mw=round(abs_err, 2),
                    lead_time_hours=lead_time_hrs,
                    forecast_publish_time=pub_time
                ))
            else:
                points.append(SettlementPoint(
                    start_time=start_time,
                    settlement_period=period,
                    actual_mw=actual_gen,
                    forecast_mw=None,
                    error_mw=None,
                    abs_error_mw=None,
                    lead_time_hours=None,
                    forecast_publish_time=None
                ))

        day_mae = float(np.mean([abs(e) for e in errors])) if errors else None
        day_rmse = float(np.sqrt(np.mean([e**2 for e in errors]))) if errors else None
        day_bias = float(np.mean(errors)) if errors else None

        return DayForecastResponse(
            delivery_date=delivery_date,
            cutoff_time=cutoff_time,
            decision_datetime=cutoff_ts,
            total_periods=len(points),
            points=points,
            day_mae=round(day_mae, 2) if day_mae is not None else None,
            day_rmse=round(day_rmse, 2) if day_rmse is not None else None,
            day_bias=round(day_bias, 2) if day_bias is not None else None,
        )
    finally:
        if close_conn:
            conn.close()

def calculate_month_accuracy(
    start_date: str = "2026-01-02",
    end_date: str = "2026-02-01",
    cutoff_time: str = "11:00:00"
) -> Tuple[AccuracySummary, List[DiurnalPoint], List[LeadTimePoint], List[DailyAccuracyPoint]]:
    """
    Calculate full accuracy metrics across all delivery days in the decision window.
    """
    conn = get_connection()
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        all_errors: List[float] = []
        all_abs_errors: List[float] = []
        all_actuals: List[float] = []
        all_forecasts: List[float] = []
        
        # By hour of day (0 to 23)
        diurnal_buckets: Dict[int, List[float]] = {h: [] for h in range(24)}
        
        # By lead time bins (hours)
        lead_time_data: List[Tuple[float, float]] = [] # (lead_time, error)
        
        # By day
        daily_points: List[DailyAccuracyPoint] = []

        curr_dt = start_dt
        while curr_dt <= end_dt:
            d_str = curr_dt.strftime("%Y-%m-%d")
            day_res = get_day_forecast_and_actuals(d_str, cutoff_time, conn=conn)

            day_errs: List[float] = []
            for p in day_res.points:
                if p.actual_mw is not None and p.forecast_mw is not None and p.error_mw is not None:
                    err = p.error_mw
                    abs_err = p.abs_error_mw
                    all_errors.append(err)
                    all_abs_errors.append(abs_err)
                    all_actuals.append(p.actual_mw)
                    all_forecasts.append(p.forecast_mw)
                    day_errs.append(err)

                    # Diurnal grouping
                    hour_of_day = parse_iso(p.start_time).hour
                    diurnal_buckets[hour_of_day].append(err)

                    # Lead time
                    if p.lead_time_hours is not None:
                        lead_time_data.append((p.lead_time_hours, err))

            if day_errs:
                daily_points.append(DailyAccuracyPoint(
                    delivery_date=d_str,
                    count=len(day_errs),
                    mae_mw=round(float(np.mean([abs(e) for e in day_errs])), 2),
                    rmse_mw=round(float(np.sqrt(np.mean([e**2 for e in day_errs]))), 2),
                    bias_mw=round(float(np.mean(day_errs)), 2),
                ))

            curr_dt += timedelta(days=1)

        if not all_errors:
            summary = AccuracySummary(
                total_observations=0,
                start_date=start_date,
                end_date=end_date,
                cutoff_time=cutoff_time,
                mae_mw=0.0,
                rmse_mw=0.0,
                bias_mw=0.0,
                mape_pct=0.0,
                p50_error_mw=0.0,
                p90_error_mw=0.0,
                p95_error_mw=0.0,
                recommended_buffer_mw=0.0,
                plain_language_takeaway="No overlapping forecast and actual records found."
            )
            return summary, [], [], []

        mae = float(np.mean(all_abs_errors))
        rmse = float(np.sqrt(np.mean([e**2 for e in all_errors])))
        bias = float(np.mean(all_errors))
        
        # MAPE calculation with floor to avoid low-wind division spikes
        pct_errors = [abs(e) / max(a, 100.0) * 100.0 for e, a in zip(all_errors, all_actuals)]
        mape = float(np.mean(pct_errors))

        p50 = float(np.percentile(all_abs_errors, 50))
        p90 = float(np.percentile(all_abs_errors, 90))
        p95 = float(np.percentile(all_abs_errors, 95))

        # Diurnal points
        diurnal_list: List[DiurnalPoint] = []
        for h in range(24):
            errs = diurnal_buckets[h]
            if errs:
                diurnal_list.append(DiurnalPoint(
                    hour_of_day=h,
                    count=len(errs),
                    mae_mw=round(float(np.mean([abs(e) for e in errs])), 2),
                    rmse_mw=round(float(np.sqrt(np.mean([e**2 for e in errs]))), 2),
                    bias_mw=round(float(np.mean(errs)), 2),
                ))

        # Lead time binning: 12-18h, 18-24h, 24-30h, 30-36h, >36h
        bins = [
            ("12h - 18h", 12.0, 18.0),
            ("18h - 24h", 18.0, 24.0),
            ("24h - 30h", 24.0, 30.0),
            ("30h - 36h", 30.0, 36.0),
            ("> 36h", 36.0, 999.0),
        ]
        lead_time_points: List[LeadTimePoint] = []
        for label, b_min, b_max in bins:
            matched = [err for lt, err in lead_time_data if b_min <= lt < b_max]
            if matched:
                matched_lts = [lt for lt, err in lead_time_data if b_min <= lt < b_max]
                lead_time_points.append(LeadTimePoint(
                    lead_time_bin=label,
                    lead_time_hours_avg=round(float(np.mean(matched_lts)), 1),
                    count=len(matched),
                    mae_mw=round(float(np.mean([abs(e) for e in matched])), 2),
                    rmse_mw=round(float(np.sqrt(np.mean([e**2 for e in matched]))), 2),
                    bias_mw=round(float(np.mean(matched)), 2),
                ))

        direction = "over-forecasting (long)" if bias > 0 else "under-forecasting (short)"
        takeaway = (
            f"At the {cutoff_time} UTC D-1 auction cutoff, national wind forecasts exhibit an MAE of {mae:,.0f} MW "
            f"with a slight {direction} bias of {bias:+,.0f} MW. To cover 95% of forecast uncertainty, "
            f"the trading desk should plan for an operational thermal/flexible buffer of +/- {p95:,.0f} MW."
        )

        summary = AccuracySummary(
            total_observations=len(all_errors),
            start_date=start_date,
            end_date=end_date,
            cutoff_time=cutoff_time,
            mae_mw=round(mae, 2),
            rmse_mw=round(rmse, 2),
            bias_mw=round(bias, 2),
            mape_pct=round(mape, 2),
            p50_error_mw=round(p50, 2),
            p90_error_mw=round(p90, 2),
            p95_error_mw=round(p95, 2),
            recommended_buffer_mw=round(p95, 2),
            plain_language_takeaway=takeaway
        )

        return summary, diurnal_list, lead_time_points, daily_points
    finally:
        conn.close()
