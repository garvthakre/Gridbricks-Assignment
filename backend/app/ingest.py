import urllib.request
import json
from datetime import datetime, timedelta
from pathlib import Path
import time
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_connection, init_db

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

def fetch_json_stream(url, retries=3, backoff=2):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "EnergyUtilityDashboard/1.0", "Accept": "application/json"}
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                return json.loads(data)
        except Exception as e:
            if attempt == retries - 1:
                print(f"[Error] Failed to fetch {url}: {e}")
                raise
            print(f"[Retry {attempt+1}/{retries}] Backing off due to {e}...")
            time.sleep(backoff * (attempt + 1))
    return []

def ingest_actuals(start_date_str="2026-01-01", end_date_str="2026-02-02"):
    """
    Ingest half-hourly FUELHH actuals for fuelType == 'WIND'.
    """
    print(f"=== Starting Ingestion of FUELHH (WIND) from {start_date_str} to {end_date_str} ===")
    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")

    conn = get_connection()
    cursor = conn.cursor()

    curr_dt = start_dt
    total_inserted = 0

    while curr_dt <= end_dt:
        chunk_end = min(curr_dt + timedelta(days=4), end_dt)
        d_from = curr_dt.strftime("%Y-%m-%d")
        d_to = chunk_end.strftime("%Y-%m-%d")
        url = f"{BASE_URL}/FUELHH/stream?settlementDateFrom={d_from}&settlementDateTo={d_to}"
        print(f"Fetching FUELHH [{d_from} -> {d_to}]...")

        try:
            items = fetch_json_stream(url)
            wind_rows = []
            for item in items:
                if item.get("fuelType") == "WIND":
                    wind_rows.append((
                        item.get("startTime"),
                        item.get("settlementDate"),
                        item.get("settlementPeriod"),
                        float(item.get("generation", 0.0)),
                        item.get("publishTime")
                    ))
            
            cursor.executemany("""
                INSERT OR REPLACE INTO actuals (start_time, settlement_date, settlement_period, generation, publish_time)
                VALUES (?, ?, ?, ?, ?)
            """, wind_rows)
            conn.commit()
            total_inserted += len(wind_rows)
            print(f"  -> Inserted {len(wind_rows)} WIND records (Total: {total_inserted})")
        except Exception as e:
            print(f"  -> Skipping chunk due to error: {e}")

        curr_dt = chunk_end + timedelta(days=1)
        time.sleep(0.5)

    conn.close()
    print(f"=== Completed FUELHH Ingestion. Total Wind Records: {total_inserted} ===")

def ingest_forecasts(start_date_str="2025-12-30", end_date_str="2026-02-02"):
    """
    Ingest WINDFOR forecasts published between start_date and end_date.
    """
    print(f"=== Starting Ingestion of WINDFOR from {start_date_str} to {end_date_str} ===")
    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")

    conn = get_connection()
    cursor = conn.cursor()

    curr_dt = start_dt
    total_inserted = 0

    while curr_dt <= end_dt:
        chunk_end = min(curr_dt + timedelta(days=3), end_dt)
        p_from = curr_dt.strftime("%Y-%m-%dT00:00:00Z")
        p_to = (chunk_end + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        url = f"{BASE_URL}/WINDFOR/stream?publishDateTimeFrom={p_from}&publishDateTimeTo={p_to}"
        print(f"Fetching WINDFOR [{p_from} -> {p_to}]...")

        try:
            items = fetch_json_stream(url)
            forecast_rows = []
            for item in items:
                pub_time = item.get("publishTime")
                start_time = item.get("startTime")
                gen = item.get("generation")
                if pub_time and start_time and gen is not None:
                    forecast_rows.append((
                        pub_time,
                        start_time,
                        float(gen)
                    ))

            cursor.executemany("""
                INSERT INTO forecasts (publish_time, start_time, generation)
                VALUES (?, ?, ?)
            """, forecast_rows)
            conn.commit()
            total_inserted += len(forecast_rows)
            print(f"  -> Inserted {len(forecast_rows)} WINDFOR records (Total: {total_inserted})")
        except Exception as e:
            print(f"  -> Skipping chunk due to error: {e}")

        curr_dt = chunk_end + timedelta(days=1)
        time.sleep(0.5)

    conn.close()
    print(f"=== Completed WINDFOR Ingestion. Total Forecast Records: {total_inserted} ===")

def main():
    init_db()
    ingest_actuals("2026-01-01", "2026-02-02")
    ingest_forecasts("2025-12-30", "2026-02-02")
    print("All ingestion completed successfully!")

if __name__ == "__main__":
    main()
