#!/usr/bin/env python3
"""Run badges migration. Safe to run: adds column only if products table exists.
Run from project root: python3 scripts/run-migration-badges.py
Or from backend with venv: cd backend && .venv/bin/python -c \"exec(open('../scripts/run-migration-badges.py').read())\"
"""
import os
import sys
# Allow importing app when run from project root
backend = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(backend))
os.chdir(backend)

from sqlalchemy import create_engine, text
from app.config import settings

def main():
    engine = create_engine(settings.DATABASE_URL_SYNC)
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'products'"
        ))
        if not r.fetchone():
            print("Products table does not exist yet. Start the backend once to create tables, then run this again if needed.")
            return
        conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '{}'"
        ))
        conn.commit()
    print("Migration done: products.badges column added or already present.")

if __name__ == "__main__":
    main()
