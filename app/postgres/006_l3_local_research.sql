-- L3: local PERSONAL research storage. No synthetic identity, institutional auth, or cloud.
CREATE SCHEMA IF NOT EXISTS local_research;
CREATE TABLE IF NOT EXISTS local_research.projects (
 id uuid PRIMARY KEY, title text NOT NULL CHECK(length(title) BETWEEN 3 AND 150),
 description text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS local_research.source_snapshots (
 series_key text NOT NULL, capture_utc timestamptz NOT NULL,
 indicator_uid text NOT NULL, country_iso3 text NOT NULL,
 endpoint text NOT NULL, source_url text NOT NULL,
 raw_sha256 text NOT NULL CHECK(raw_sha256 ~ '^[a-f0-9]{64}$'),
 raw_bytes integer NOT NULL, dataset_lastupdated date NOT NULL,
 licence_status text NOT NULL, licence_url text NOT NULL,
 indicator_definition text NOT NULL, underlying_providers text NOT NULL,
 observations jsonb NOT NULL CHECK(jsonb_typeof(observations)='array'),
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(series_key,capture_utc)
);
CREATE TABLE IF NOT EXISTS local_research.notes (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES local_research.projects(id),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 20000),
 series_key text, capture_utc timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((series_key IS NULL)=(capture_utc IS NULL)),
 FOREIGN KEY(series_key,capture_utc) REFERENCES local_research.source_snapshots(series_key,capture_utc)
);
CREATE INDEX IF NOT EXISTS l3_note_project ON local_research.notes(project_id,created_at);
