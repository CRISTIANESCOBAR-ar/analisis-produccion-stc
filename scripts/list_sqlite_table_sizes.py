#!/usr/bin/env python3
import os
import sqlite3
import sys
from math import log

def human(n):
    if n is None:
        return "0 B"
    if n == 0:
        return "0 B"
    units = ["B","KB","MB","GB","TB"]
    i = int(log(n,1024)) if n>0 else 0
    i = min(i, len(units)-1)
    return f"{n/ (1024**i):.2f} {units[i]}"

def main():
    # Try common DB paths relative to repo root
    candidates = [
        os.path.join(os.getcwd(), "database", "produccion.db"),
        os.path.join(os.getcwd(), "produccion.db"),
        os.path.join(os.path.dirname(__file__), "..", "database", "produccion.db")
    ]
    db_path = None
    for p in candidates:
        p = os.path.abspath(p)
        if os.path.exists(p):
            db_path = p
            break
    if not db_path:
        print("ERROR: no se encontró database/produccion.db. Busqué en:")
        for p in candidates:
            print(" - ", os.path.abspath(p))
        sys.exit(2)

    print("DB file:", db_path)
    try:
        db_size = os.path.getsize(db_path)
    except Exception as e:
        db_size = None
    print("DB file size:", human(db_size))
    print()

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    if not tables:
        print("No se encontraron tablas de usuario en la base de datos.")
        return

    rows = []
    for t in tables:
        # get columns
        try:
            cur.execute(f"PRAGMA table_info('{t}')")
            cols = [r[1] for r in cur.fetchall()]
        except Exception:
            cols = []
        if not cols:
            # fallback: count only
            try:
                cur.execute(f"SELECT COUNT(*) FROM \"{t}\"")
                cnt = cur.fetchone()[0]
            except Exception:
                cnt = None
            approx = None
        else:
            # build sum expression
            parts = []
            for c in cols:
                # quote column name
                parts.append(f"COALESCE(LENGTH(\"{c}\"),0)")
            expr = " + ".join(parts)
            sql = f'SELECT COUNT(*) as cnt, COALESCE(SUM({expr}),0) as approx_bytes FROM "{t}"'
            try:
                cur.execute(sql)
                cnt, approx = cur.fetchone()
            except Exception:
                cnt, approx = None, None
        rows.append((t, cnt if cnt is not None else 0, approx if approx is not None else 0))

    # try dbstat (better page-level sizes) if available
    dbstat_available = False
    stat_map = {}
    try:
        cur.execute("SELECT name, SUM(pgsize) as sum_pg FROM dbstat GROUP BY name")
        for r in cur.fetchall():
            stat_map[r[0]] = r[1]
        dbstat_available = True
    except Exception:
        dbstat_available = False

    # print table
    print(f"{'TABLE':40} {'ROWS':>12} {'APPROX_BYTES':>16} {'APPROX_HUM':>12} {'DBSTAT_BYTES':>16} {'DBSTAT_HUM':>12}")
    print('-'*110)
    for t, cnt, approx in sorted(rows, key=lambda x: (stat_map.get(x[0], approx) if dbstat_available else x[2]), reverse=True):
        dbs = stat_map.get(t)
        print(f"{t:40} {cnt:12,d} {approx:16,d} {human(approx):>12} { (dbs if dbs is not None else 0):16,d} {human(dbs if dbs is not None else 0):>12}")

    # totals
    total_rows = sum(r[1] for r in rows)
    total_approx = sum(r[2] for r in rows)
    print('\nTotals:')
    print(f"Tables: {len(rows)}, Total rows: {total_rows:,}, Approx bytes (sum of LENGTH()): {total_approx:,} ({human(total_approx)})")
    if db_size is not None:
        print(f"DB file size: {db_size:,} bytes ({human(db_size)})")

if __name__ == '__main__':
    main()
