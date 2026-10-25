-- Raw public candidate responses and analyst review state, separate from accepted snapshots.
CREATE TABLE IF NOT EXISTS local_research.source_reviews (
 id uuid PRIMARY KEY, captured_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'awaiting_review' CHECK(status IN ('awaiting_review','reviewed')),
 analyst_note text NOT NULL DEFAULT '', change_count integer NOT NULL,
 packet jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
