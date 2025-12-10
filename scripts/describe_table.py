#!/usr/bin/env python3
import sqlite3, sys, os
if len(sys.argv)<2:
    print('Usage: describe_table.py <TABLE_NAME>')
    sys.exit(2)
name=sys.argv[1]
db=os.path.join(os.getcwd(),'database','produccion.db')
if not os.path.exists(db):
    print('DB not found at', db)
    sys.exit(1)
con=sqlite3.connect(db)
cur=con.cursor()
cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (name,))
r=cur.fetchone()
if not r:
    print('NO TABLE', name)
else:
    print('CREATE TABLE:')
    print(r[0])

cur.execute("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE (type='index' OR type='trigger') AND (sql LIKE ? OR tbl_name=?)", (f'%{name}%', name))
rows=cur.fetchall()
if rows:
    print('\nRelated indexes/triggers:')
    for row in rows:
        print(row)
else:
    print('\nNo related indexes/triggers found in sqlite_master')

# show some sample rows count and columns
try:
    cur.execute(f'SELECT COUNT(*) FROM "{name}"')
    cnt=cur.fetchone()[0]
    print('\nRow count:', cnt)
    cur.execute(f'PRAGMA table_info("{name}")')
    cols=cur.fetchall()
    print('Columns:')
    for c in cols:
        print(' -', c[1], c[2])
except Exception as e:
    print('Could not query rows/columns:', e)
con.close()
