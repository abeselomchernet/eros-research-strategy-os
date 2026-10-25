-- Additive only. Legacy current notes become explicit baseline events, not invented history.
ALTER TABLE local_research.notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION local_research.note_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.version<>OLD.version THEN RAISE EXCEPTION 'Note version is server generated'; END IF;
 NEW.version=OLD.version+1; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS backend_note_version ON local_research.notes;
CREATE TRIGGER backend_note_version BEFORE UPDATE ON local_research.notes FOR EACH ROW EXECUTE FUNCTION local_research.note_version_guard();
ALTER TABLE local_research.source_reviews ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS local_research.source_review_events (
 review_id uuid NOT NULL REFERENCES local_research.source_reviews(id),
 version integer NOT NULL CHECK(version>0), event_type text NOT NULL,
 analyst_note text NOT NULL, actor_claim text NOT NULL,
 actor_assurance text NOT NULL DEFAULT 'local_unverified_claim',
 recorded_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(review_id,version)
);
CREATE OR REPLACE FUNCTION local_research.immutable_backend_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable history: update/delete/truncate forbidden'; END; $$;
CREATE OR REPLACE FUNCTION local_research.source_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO local_research.source_review_events(review_id,version,event_type,analyst_note,actor_claim)
  VALUES(NEW.id,1,'migration_baseline',NEW.analyst_note,'unknown; baseline at creation');
  RETURN NEW;
 END IF;
 IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Source reviews cannot be deleted'; END IF;
 IF NEW.packet IS DISTINCT FROM OLD.packet OR NEW.id<>OLD.id OR NEW.captured_at<>OLD.captured_at OR NEW.change_count<>OLD.change_count OR NEW.created_at<>OLD.created_at THEN
  RAISE EXCEPTION 'Immutable candidate packet';
 END IF;
 IF NEW.version<>OLD.version+1 OR NEW.status<>'reviewed' THEN RAISE EXCEPTION 'Review version conflict'; END IF;
 IF NOT EXISTS(SELECT 1 FROM local_research.source_review_events WHERE review_id=NEW.id AND version=NEW.version AND analyst_note=NEW.analyst_note) THEN
  RAISE EXCEPTION 'Review event required';
 END IF;
 RETURN NEW;
END; $$;
INSERT INTO local_research.source_review_events(review_id,version,event_type,analyst_note,actor_claim)
 SELECT id,version,'migration_baseline',analyst_note,'unknown; legacy current value only' FROM local_research.source_reviews ON CONFLICT DO NOTHING;
DROP TRIGGER IF EXISTS backend_review_guard ON local_research.source_reviews;
CREATE TRIGGER backend_review_guard AFTER INSERT OR UPDATE OR DELETE ON local_research.source_reviews FOR EACH ROW EXECUTE FUNCTION local_research.source_review_guard();
DROP TRIGGER IF EXISTS backend_review_immutable ON local_research.source_review_events;
CREATE TRIGGER backend_review_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON local_research.source_review_events FOR EACH STATEMENT EXECUTE FUNCTION local_research.immutable_backend_row();

CREATE TABLE IF NOT EXISTS local_research.evidence_refs (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES local_research.projects(id),
 kind text NOT NULL CHECK(kind IN ('snapshot','candidate','record','note')),
 target jsonb NOT NULL, span jsonb NOT NULL, snapshot jsonb NOT NULL,
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,project_id)
);
CREATE TABLE IF NOT EXISTS local_research.backend_records (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES local_research.projects(id),
 kind text NOT NULL CHECK(kind IN ('issue','question','research','action','decision','criterion','portfolio','rights')),
 UNIQUE(id,project_id)
);
CREATE TABLE IF NOT EXISTS local_research.backend_events (
 record_id uuid NOT NULL, project_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 operation text NOT NULL, state text NOT NULL, content jsonb NOT NULL CHECK(jsonb_typeof(content)='object'),
 rationale text NOT NULL CHECK(length(rationale) BETWEEN 3 AND 4000),
 actor_claim text NOT NULL CHECK(length(actor_claim) BETWEEN 1 AND 150),
 actor_assurance text NOT NULL DEFAULT 'local_unverified_claim' CHECK(actor_assurance='local_unverified_claim'),
 request_key text NOT NULL CHECK(length(request_key) BETWEEN 8 AND 100),
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 transaction_id bigint NOT NULL DEFAULT txid_current(),
 PRIMARY KEY(record_id,version), UNIQUE(project_id,request_key),
 FOREIGN KEY(record_id,project_id) REFERENCES local_research.backend_records(id,project_id)
);
CREATE TABLE IF NOT EXISTS local_research.backend_links (
 record_id uuid NOT NULL, version integer NOT NULL, project_id uuid NOT NULL,
 evidence_id uuid NOT NULL, relation text NOT NULL CHECK(relation IN ('supports','contradicts','origin','completion','outcome')),
 PRIMARY KEY(record_id,version,evidence_id,relation),
 FOREIGN KEY(record_id,version) REFERENCES local_research.backend_events(record_id,version),
 FOREIGN KEY(record_id,project_id) REFERENCES local_research.backend_records(id,project_id),
 FOREIGN KEY(evidence_id,project_id) REFERENCES local_research.evidence_refs(id,project_id)
);
CREATE TABLE IF NOT EXISTS local_research.frozen_exports (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES local_research.projects(id),
 request_key text NOT NULL, request_sha256 text NOT NULL, content text NOT NULL,
 manifest jsonb NOT NULL, sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,request_key)
);
CREATE OR REPLACE FUNCTION local_research.backend_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oldrow local_research.backend_events; k text;
BEGIN
 -- Serialize within a record even for callers outside the HTTP request queue.
 SELECT kind INTO k FROM local_research.backend_records WHERE id=NEW.record_id FOR UPDATE;
 SELECT * INTO oldrow FROM local_research.backend_events WHERE record_id=NEW.record_id ORDER BY version DESC LIMIT 1;
 IF NEW.version<>COALESCE(oldrow.version,0)+1 THEN RAISE EXCEPTION 'Version conflict'; END IF;
 IF oldrow.version IS NULL THEN
  IF NEW.operation<>'create' THEN RAISE EXCEPTION 'Creation required'; END IF;
  IF NEW.state<>(CASE k WHEN 'issue' THEN 'open' WHEN 'action' THEN 'proposed' WHEN 'criterion' THEN 'active' WHEN 'portfolio' THEN 'not_evaluated' WHEN 'rights' THEN 'recorded' ELSE 'draft' END) THEN RAISE EXCEPTION 'Invalid initial state'; END IF;
  RETURN NEW;
 END IF;
 IF k IN ('research','decision') THEN
  IF NOT ((oldrow.state='draft' AND NEW.state IN ('draft','submitted')) OR
    (oldrow.state='submitted' AND NEW.state IN ('accepted','returned','rejected')) OR
    (oldrow.state='returned' AND NEW.state='draft')) THEN RAISE EXCEPTION 'Prohibited revision transition'; END IF;
  IF oldrow.state<>'draft' AND NEW.content IS DISTINCT FROM oldrow.content THEN RAISE EXCEPTION 'Submitted content immutable'; END IF;
  IF NEW.operation<>(CASE WHEN oldrow.state='draft' AND NEW.state='draft' THEN 'edit' WHEN NEW.state='submitted' THEN 'submit' WHEN NEW.state='accepted' THEN 'accept' WHEN NEW.state='returned' THEN 'return' WHEN NEW.state='rejected' THEN 'reject' ELSE 'revise' END) THEN RAISE EXCEPTION 'Invalid revision operation'; END IF;
 ELSIF k='action' THEN
  IF NOT ((oldrow.state='proposed' AND NEW.state IN ('proposed','decided')) OR
   (oldrow.state='decided' AND NEW.state='completed') OR
   (oldrow.state='completed' AND NEW.state='outcome_verified')) THEN RAISE EXCEPTION 'Prohibited action transition'; END IF;
  IF oldrow.state<>'proposed' AND NEW.content IS DISTINCT FROM oldrow.content THEN RAISE EXCEPTION 'Decided action immutable'; END IF;
  IF NEW.operation<>(CASE NEW.state WHEN 'proposed' THEN 'edit' WHEN 'decided' THEN 'decide' WHEN 'completed' THEN 'complete' ELSE 'verify' END) THEN RAISE EXCEPTION 'Invalid action operation'; END IF;
 ELSIF k='issue' THEN
  IF oldrow.state='resolved' OR NEW.state NOT IN ('open','under_investigation','hold','resolved') OR NEW.operation<>'disposition' OR NEW.content IS DISTINCT FROM oldrow.content THEN RAISE EXCEPTION 'Immutable issue context or prohibited disposition'; END IF;
 ELSIF k='question' THEN
  IF NOT ((oldrow.state='draft' AND NEW.state='draft' AND NEW.operation='edit') OR (oldrow.state='draft' AND NEW.state='active' AND NEW.operation='activate') OR (oldrow.state='active' AND NEW.state='returned' AND NEW.operation='return') OR (oldrow.state='returned' AND NEW.state='draft' AND NEW.operation='revise') OR (oldrow.state='active' AND NEW.state='closed' AND NEW.operation='close')) THEN RAISE EXCEPTION 'Prohibited question transition'; END IF;
 ELSE
  IF NEW.operation<>'revise' OR NEW.state<>oldrow.state THEN RAISE EXCEPTION 'Revision operation required'; END IF;
  IF k='rights' AND (NEW.content->'evidence_id' IS DISTINCT FROM oldrow.content->'evidence_id' OR NEW.content->'intended_use' IS DISTINCT FROM oldrow.content->'intended_use') THEN RAISE EXCEPTION 'Rights scope immutable'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION local_research.backend_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM local_research.backend_events WHERE record_id=NEW.record_id AND version=NEW.version AND transaction_id=txid_current()) THEN RAISE EXCEPTION 'Immutable revision links'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS backend_link_guard ON local_research.backend_links;
CREATE TRIGGER backend_link_guard BEFORE INSERT ON local_research.backend_links FOR EACH ROW EXECUTE FUNCTION local_research.backend_link_guard();
CREATE OR REPLACE FUNCTION local_research.backend_event_finalize() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text; oldstate text;
BEGIN
 SELECT kind INTO k FROM local_research.backend_records WHERE id=NEW.record_id;
 SELECT state INTO oldstate FROM local_research.backend_events WHERE record_id=NEW.record_id AND version=NEW.version-1;
 IF (k='issue' OR (k IN ('research','decision') AND NEW.state='submitted')) AND NOT EXISTS(SELECT 1 FROM local_research.backend_links WHERE record_id=NEW.record_id AND version=NEW.version AND relation='supports') THEN RAISE EXCEPTION 'Supporting evidence required'; END IF;
 IF k='action' AND NEW.state IN ('completed','outcome_verified') AND NOT EXISTS(SELECT 1 FROM local_research.backend_links WHERE record_id=NEW.record_id AND version=NEW.version AND relation=CASE NEW.state WHEN 'completed' THEN 'completion' ELSE 'outcome' END) THEN RAISE EXCEPTION 'Completion/outcome evidence required'; END IF;
 IF ((k IN ('research','decision') AND oldstate IN ('submitted','returned')) OR (k='issue' AND NEW.version>1)) AND EXISTS(
  (SELECT evidence_id,relation FROM local_research.backend_links WHERE record_id=NEW.record_id AND version=NEW.version
    EXCEPT SELECT evidence_id,relation FROM local_research.backend_links WHERE record_id=NEW.record_id AND version=NEW.version-1)
  UNION ALL
  (SELECT evidence_id,relation FROM local_research.backend_links WHERE record_id=NEW.record_id AND version=NEW.version-1
    EXCEPT SELECT evidence_id,relation FROM local_research.backend_links WHERE record_id=NEW.record_id AND version=NEW.version)
 ) THEN RAISE EXCEPTION 'Submitted citations immutable'; END IF;
 RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS backend_event_finalize ON local_research.backend_events;
CREATE CONSTRAINT TRIGGER backend_event_finalize AFTER INSERT ON local_research.backend_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION local_research.backend_event_finalize();
DROP TRIGGER IF EXISTS backend_event_guard ON local_research.backend_events;
CREATE TRIGGER backend_event_guard BEFORE INSERT ON local_research.backend_events FOR EACH ROW EXECUTE FUNCTION local_research.backend_event_guard();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['evidence_refs','backend_records','backend_events','backend_links','frozen_exports'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS backend_immutable ON local_research.%I',t);
  EXECUTE format('CREATE TRIGGER backend_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON local_research.%I FOR EACH STATEMENT EXECUTE FUNCTION local_research.immutable_backend_row()',t);
 END LOOP;
END; $$;
