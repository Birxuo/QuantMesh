import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "provider", "quantmesh.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DELETE FROM transactions")
        conn.commit()
        print("Database cleared. Ready for fresh demo run.")
    except sqlite3.OperationalError as e:
        print(f"Error clearing database: {e}")
    finally:
        conn.close()
else:
    print(f"Database not found at {db_path}")
