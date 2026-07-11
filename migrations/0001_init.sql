-- sigil historical store (Cloudflare D1 / SQLite).
-- Apply locally:  wrangler d1 migrations apply DB --local
-- Apply remote:   wrangler d1 migrations apply DB --remote

-- One row per user per capture. Normalized columns power efficient trend
-- queries; metrics_json keeps the full snapshot for forward-compatibility.
CREATE TABLE IF NOT EXISTS snapshots (
  username      TEXT    NOT NULL,
  captured_at   TEXT    NOT NULL,          -- ISO-8601 UTC
  stars         INTEGER NOT NULL DEFAULT 0,
  commits       INTEGER NOT NULL DEFAULT 0,
  contributions INTEGER NOT NULL DEFAULT 0,
  followers     INTEGER NOT NULL DEFAULT 0,
  metrics_json  TEXT    NOT NULL,
  PRIMARY KEY (username, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_time
  ON snapshots (username, captured_at);

-- Precomputed AI developer summaries. Written only by the scheduled job, never
-- on the request path.
CREATE TABLE IF NOT EXISTS summaries (
  username     TEXT PRIMARY KEY,
  summary      TEXT NOT NULL,
  model        TEXT,
  generated_at TEXT NOT NULL                -- ISO-8601 UTC
);
