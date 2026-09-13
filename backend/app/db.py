import os
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS farm_profiles (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT,
    district TEXT,
    soil_type TEXT,
    land_size_acres DOUBLE PRECISION,
    irrigation BOOLEAN,
    current_crop TEXT,
    season TEXT,
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
    id BIGSERIAL PRIMARY KEY,
    farmer_name TEXT,
    language TEXT,
    message TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crop_health_history (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT,
    mime_type TEXT,
    analysis TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_price_cache (
    id BIGSERIAL PRIMARY KEY,
    commodity TEXT NOT NULL,
    state TEXT,
    district TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crop_health_created_at ON crop_health_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_price_cache_lookup ON market_price_cache(commodity, state, district, created_at DESC);
"""


def is_configured() -> bool:
    return bool(DATABASE_URL)


@contextmanager
def connection() -> Iterator[psycopg.Connection]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> bool:
    if not DATABASE_URL:
        return False
    with connection() as conn:
        conn.execute(SCHEMA_SQL)
    return True


def save_chat(farmer_name: str, language: str, message: str, answer: str) -> None:
    if not DATABASE_URL:
        return
    with connection() as conn:
        conn.execute(
            "INSERT INTO chat_history (farmer_name, language, message, answer) VALUES (%s, %s, %s, %s)",
            (farmer_name, language, message, answer),
        )


def save_crop_health(filename: str, mime_type: str, analysis: str) -> None:
    if not DATABASE_URL:
        return
    with connection() as conn:
        conn.execute(
            "INSERT INTO crop_health_history (filename, mime_type, analysis) VALUES (%s, %s, %s)",
            (filename, mime_type, analysis),
        )


def save_farm_profile(profile: dict[str, Any]) -> None:
    if not DATABASE_URL:
        return
    with connection() as conn:
        conn.execute(
            """INSERT INTO farm_profiles
            (name, state, district, soil_type, land_size_acres, irrigation, current_crop, season, language)
            VALUES (%(name)s, %(state)s, %(district)s, %(soil_type)s, %(land_size_acres)s,
                    %(irrigation)s, %(current_crop)s, %(season)s, %(language)s)""",
            profile,
        )


def db_status() -> dict[str, Any]:
    if not DATABASE_URL:
        return {"configured": False, "connected": False}
    try:
        with connection() as conn:
            row = conn.execute("SELECT NOW() AS server_time").fetchone()
        return {"configured": True, "connected": True, "server_time": row["server_time"].isoformat()}
    except Exception as exc:
        return {"configured": True, "connected": False, "error": str(exc)[:300]}
