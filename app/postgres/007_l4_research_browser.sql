-- Additive personal research migration; earlier archives and databases are preserved.
ALTER TABLE local_research.projects ADD COLUMN IF NOT EXISTS objectives text NOT NULL DEFAULT '';
ALTER TABLE local_research.projects ADD COLUMN IF NOT EXISTS questions text NOT NULL DEFAULT '';
ALTER TABLE local_research.projects ADD COLUMN IF NOT EXISTS reference_notes text NOT NULL DEFAULT '';
ALTER TABLE local_research.projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived'));
ALTER TABLE local_research.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE local_research.notes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'interpretation' CHECK(kind IN ('interpretation','factual_extract','hypothesis'));
CREATE TABLE IF NOT EXISTS local_research.project_sources (
 project_id uuid NOT NULL REFERENCES local_research.projects(id),
 series_key text NOT NULL, capture_utc timestamptz NOT NULL,
 attached_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(project_id,series_key,capture_utc),
 FOREIGN KEY(series_key,capture_utc) REFERENCES local_research.source_snapshots(series_key,capture_utc)
);
