import sqlite3
import os
from pathlib import Path

DB_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent.parent / "data" / "energy_data.db"))

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Table for FUELHH actuals (fuelType = WIND)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS actuals (
        start_time TEXT PRIMARY KEY,
        settlement_date TEXT NOT NULL,
        settlement_period INTEGER NOT NULL,
        generation REAL NOT NULL,
        publish_time TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actuals_date ON actuals(settlement_date);")

    # Table for WINDFOR forecasts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        publish_time TEXT NOT NULL,
        start_time TEXT NOT NULL,
        generation REAL NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecasts_lookup ON forecasts(start_time, publish_time);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecasts_pub ON forecasts(publish_time);")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized at", DB_PATH)
