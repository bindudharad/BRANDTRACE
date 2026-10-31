import sqlite3
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = REPO_ROOT / "brandtrace.db"

def inspect_database():
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} does not exist!")
        sys.exit(1)

    stat = DB_PATH.stat()
    size = stat.st_size
    mtime = stat.st_mtime
    import datetime
    mtime_str = datetime.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")

    print("=" * 70)
    print("BRANDTRACE - PRODUCTION DATABASE INTEGRITY AUDIT")
    print("=" * 70)
    print(f"Path: {DB_PATH}")
    print(f"Size: {size} bytes ({size / 1024:.2f} KB, {size / 4096:.1f} pages @ 4096 B/page)")
    print(f"Last Modified: {mtime_str} (timestamp: {mtime})")

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # 1. Integrity check
    cursor.execute("PRAGMA integrity_check;")
    integrity = cursor.fetchall()
    print(f"\nPRAGMA integrity_check: {integrity}")
    assert integrity == [("ok",)], f"Integrity check failed: {integrity}"

    # 2. Foreign key check
    cursor.execute("PRAGMA foreign_key_check;")
    fk_violations = cursor.fetchall()
    print(f"PRAGMA foreign_key_check: {len(fk_violations)} violations")
    assert len(fk_violations) == 0, f"FK check failed: {fk_violations}"

    # 3. Table counts & record inventory
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"\nTotal Tables: {len(tables)}")

    total_records = 0
    table_inventory = {}
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM \"{t}\";")
        cnt = cursor.fetchone()[0]
        table_inventory[t] = cnt
        total_records += cnt
        print(f"  - {t:<30}: {cnt} records")

    print(f"\nTotal Records Across All Tables: {total_records}")
    conn.close()

    return {
        "size": size,
        "mtime": mtime,
        "mtime_str": mtime_str,
        "integrity": integrity[0][0],
        "fk_violations": len(fk_violations),
        "tables": table_inventory,
        "total_records": total_records,
    }

if __name__ == "__main__":
    inspect_database()
