-- EROS v1.1 Milestone C1: Indicator Registry, Ontology Ledger & Data Contracts (Corrected v0.5.1-r1)
-- Additive PostgreSQL migration; migrations 001-008 preserved exactly.
-- PGlite / PostgreSQL 16 compatible; no SQLite syntax (no BEGIN IMMEDIATE), no DROP SCHEMA CASCADE.

CREATE SCHEMA IF NOT EXISTS ontology;

-- 1. Source Providers Registry
CREATE TABLE IF NOT EXISTS ontology.source_providers (
    provider_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    tier VARCHAR(32) NOT NULL CHECK (tier IN ('multilateral', 'regional', 'national_authority', 'academic_industry')),
    base_url TEXT NOT NULL,
    documentation_url TEXT NOT NULL,
    terms_of_use_url TEXT NOT NULL,
    default_rights_status VARCHAR(64) NOT NULL CHECK (default_rights_status IN ('public_open_access', 'cc_by_4_0', 'third_party_exceptions_pending_review', 'restricted_permission_required')),
    requires_authentication BOOLEAN NOT NULL DEFAULT FALSE,
    auth_header_name VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Provider Datasets (with composite identity constraint)
CREATE TABLE IF NOT EXISTS ontology.provider_datasets (
    dataset_id VARCHAR(64) PRIMARY KEY,
    provider_id VARCHAR(32) NOT NULL REFERENCES ontology.source_providers(provider_id) ON DELETE RESTRICT,
    dataset_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    protocol VARCHAR(32) NOT NULL CHECK (protocol IN ('rest_json', 'sdmx_3_0_json', 'sdmx_2_1_json', 'csv_bulk')),
    endpoint_template TEXT NOT NULL,
    frequency VARCHAR(16) NOT NULL,
    native_frequency_code VARCHAR(16) NOT NULL DEFAULT 'A',
    default_confidence_tier VARCHAR(16) NOT NULL CHECK (default_confidence_tier IN ('high', 'medium', 'low')),
    last_known_vintage VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_id, dataset_id)
);

-- 3. Canonical Indicators Ledger
CREATE TABLE IF NOT EXISTS ontology.canonical_indicators (
    canonical_code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    unit VARCHAR(64) NOT NULL,
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('positive', 'negative', 'neutral')),
    frequency VARCHAR(16) NOT NULL CHECK (frequency IN ('annual', 'quarterly', 'monthly', 'triennial', 'ad_hoc')),
    is_density BOOLEAN NOT NULL DEFAULT FALSE,
    required_denominator_code VARCHAR(64) REFERENCES ontology.canonical_indicators(canonical_code) ON DELETE RESTRICT,
    concept_tier VARCHAR(24) NOT NULL DEFAULT 'archived_verified' CHECK (concept_tier IN ('archived_verified', 'provisional_unverified')),
    methodology_description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cross-Provider Indicator Aliases / Mappings
-- Incorporates composite FK (provider_id, provider_dataset_id) and versioned revocation/supersession fields
CREATE TABLE IF NOT EXISTS ontology.indicator_aliases (
    alias_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id VARCHAR(32) NOT NULL,
    provider_dataset_id VARCHAR(64) NOT NULL,
    native_variable_code VARCHAR(128) NOT NULL,
    canonical_code VARCHAR(64) NOT NULL REFERENCES ontology.canonical_indicators(canonical_code) ON DELETE RESTRICT,
    mapping_status VARCHAR(24) NOT NULL CHECK (mapping_status IN ('candidate', 'approved', 'deprecated', 'rejected', 'revoked', 'superseded')),
    concept_equivalence_grade VARCHAR(16) NOT NULL CHECK (concept_equivalence_grade IN ('A_EXACT', 'B_PROXY', 'C_CONDITIONAL')),
    unit_conversion_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    unit_conversion_offset DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    governance_review_notes TEXT NOT NULL DEFAULT '',
    reviewed_by VARCHAR(64) NOT NULL DEFAULT 'unreviewed',
    reviewed_at TIMESTAMPTZ,
    approval_evidence TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    previous_alias_id UUID REFERENCES ontology.indicator_aliases(alias_id) ON DELETE RESTRICT,
    revoked_by VARCHAR(64),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    superseded_by_alias_id UUID REFERENCES ontology.indicator_aliases(alias_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (provider_id, provider_dataset_id) REFERENCES ontology.provider_datasets(provider_id, dataset_id) ON DELETE RESTRICT,
    UNIQUE (provider_id, provider_dataset_id, native_variable_code)
);

-- 5. Verified Provider Country Series
-- Incorporates composite FK (provider_id, provider_dataset_id)
CREATE TABLE IF NOT EXISTS ontology.provider_series (
    series_key VARCHAR(128) PRIMARY KEY,
    provider_id VARCHAR(32) NOT NULL,
    provider_dataset_id VARCHAR(64) NOT NULL,
    native_variable_code VARCHAR(128) NOT NULL,
    country_iso3 VARCHAR(8) NOT NULL,
    country_name VARCHAR(128) NOT NULL,
    canonical_code VARCHAR(64) NOT NULL REFERENCES ontology.canonical_indicators(canonical_code) ON DELETE RESTRICT,
    endpoint TEXT NOT NULL,
    source_url TEXT NOT NULL,
    raw_sha256 VARCHAR(64) CHECK (raw_sha256 IS NULL OR raw_sha256 ~ '^[a-f0-9]{64}$'),
    raw_bytes INTEGER,
    dataset_lastupdated DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (provider_id, provider_dataset_id) REFERENCES ontology.provider_datasets(provider_id, dataset_id) ON DELETE RESTRICT,
    UNIQUE (provider_id, provider_dataset_id, country_iso3, native_variable_code)
);

-- Indexes for performance and referential lookups
CREATE INDEX IF NOT EXISTS idx_pd_provider ON ontology.provider_datasets(provider_id);
CREATE INDEX IF NOT EXISTS idx_alias_lookup ON ontology.indicator_aliases(provider_id, provider_dataset_id, native_variable_code);
CREATE INDEX IF NOT EXISTS idx_alias_canonical ON ontology.indicator_aliases(canonical_code);
CREATE INDEX IF NOT EXISTS idx_alias_status ON ontology.indicator_aliases(mapping_status);
CREATE INDEX IF NOT EXISTS idx_ps_canonical ON ontology.provider_series(canonical_code);
CREATE INDEX IF NOT EXISTS idx_ps_country ON ontology.provider_series(country_iso3);
CREATE INDEX IF NOT EXISTS idx_ps_provider_native ON ontology.provider_series(provider_id, native_variable_code);

-- SEED DATA: Minimal, verified World Bank WDI catalogue:
-- Only 3 genuinely archived/evidenced concepts and six ETH/KEN provider series.
-- Excludes all unratified CAD proposals and unevidenced provisional concepts.

-- Seed Provider: World Bank
INSERT INTO ontology.source_providers (
    provider_id, name, organization, tier, base_url, documentation_url, terms_of_use_url, default_rights_status, requires_authentication
) VALUES (
    'world_bank',
    'World Bank Group',
    'World Bank',
    'multilateral',
    'https://api.worldbank.org/v2',
    'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589',
    'https://data.worldbank.org/summary-terms-of-use',
    'third_party_exceptions_pending_review',
    FALSE
) ON CONFLICT (provider_id) DO NOTHING;

-- Seed Dataset: World Development Indicators (WDI)
INSERT INTO ontology.provider_datasets (
    dataset_id, provider_id, dataset_name, description, protocol, endpoint_template, frequency, native_frequency_code, default_confidence_tier, last_known_vintage, is_active
) VALUES (
    'WB_WDI',
    'world_bank',
    'World Development Indicators',
    'Primary World Bank collection of development indicators compiled from officially-recognized international sources.',
    'rest_json',
    'https://api.worldbank.org/v2/country/{country}/indicator/{indicator}?format=json&source=2&date={date}&per_page={per_page}',
    'annual',
    'A',
    'high',
    '2026-10-08',
    TRUE
) ON CONFLICT (dataset_id) DO NOTHING;

-- Seed the 3 Genuinely Archived and Evidenced Canonical Indicators:
-- 1. Total Population (SP.POP.TOTL)
INSERT INTO ontology.canonical_indicators (
    canonical_code, name, domain, unit, direction, frequency, is_density, required_denominator_code, concept_tier, methodology_description
) VALUES (
    'demographic_total_population',
    'Population, total',
    'macro',
    'raw_count',
    'neutral',
    'annual',
    FALSE,
    NULL,
    'archived_verified',
    'Total population is based on the de facto definition of population, which counts all residents regardless of legal status or citizenship. Midyear estimates.'
) ON CONFLICT (canonical_code) DO NOTHING;

-- 2. Real GDP Growth (NY.GDP.MKTP.KD.ZG)
INSERT INTO ontology.canonical_indicators (
    canonical_code, name, domain, unit, direction, frequency, is_density, required_denominator_code, concept_tier, methodology_description
) VALUES (
    'macro_real_gdp_growth_annual_pct',
    'GDP growth (annual %)',
    'macro',
    '%',
    'positive',
    'annual',
    FALSE,
    NULL,
    'archived_verified',
    'Annual percentage growth rate of GDP at market prices based on constant local currency or constant 2015 U.S. dollars.'
) ON CONFLICT (canonical_code) DO NOTHING;

-- 3. Headline CPI Inflation (FP.CPI.TOTL.ZG)
INSERT INTO ontology.canonical_indicators (
    canonical_code, name, domain, unit, direction, frequency, is_density, required_denominator_code, concept_tier, methodology_description
) VALUES (
    'macro_inflation_cpi_annual_pct',
    'Inflation, consumer prices (annual %)',
    'macro',
    '%',
    'neutral',
    'annual',
    FALSE,
    NULL,
    'archived_verified',
    'Inflation as measured by the consumer price index reflects the annual percentage change in the cost to the average consumer of acquiring a basket of goods and services.'
) ON CONFLICT (canonical_code) DO NOTHING;

-- Seed the 3 Approved World Bank WDI Aliases for Evidenced Concepts:
INSERT INTO ontology.indicator_aliases (
    provider_id, provider_dataset_id, native_variable_code, canonical_code, mapping_status, concept_equivalence_grade, unit_conversion_multiplier, unit_conversion_offset, governance_review_notes, reviewed_by, reviewed_at, approval_evidence
) SELECT * FROM (VALUES
    ('world_bank', 'WB_WDI', 'SP.POP.TOTL', 'demographic_total_population', 'approved', 'A_EXACT', 1.0, 0.0, 'Verified World Bank WDI total population concept; matches UN Population Division midyear definition.', 'eros_curator', '2026-10-20T18:51:29Z'::timestamptz, 'SOURCE_MANIFEST.json: indicators.SP.POP.TOTL provenance hash 2f8491efc00bf2c0995112ff8e87aba69e5e9d22d0880b22f7e3a4ec757ba05c'),
    ('world_bank', 'WB_WDI', 'NY.GDP.MKTP.KD.ZG', 'macro_real_gdp_growth_annual_pct', 'approved', 'A_EXACT', 1.0, 0.0, 'Verified World Bank WDI real GDP growth annual %; constant 2015 USD series.', 'eros_curator', '2026-10-20T18:51:29Z'::timestamptz, 'SOURCE_MANIFEST.json: indicators.NY.GDP.MKTP.KD.ZG provenance hash ed7703d841d4dde2d1cb858f0dd53229fe3e841f72abb17dbc8c950ad20c88ce'),
    ('world_bank', 'WB_WDI', 'FP.CPI.TOTL.ZG', 'macro_inflation_cpi_annual_pct', 'approved', 'A_EXACT', 1.0, 0.0, 'Verified World Bank WDI headline CPI inflation annual %; IMF IFS source compilation.', 'eros_curator', '2026-10-20T18:51:29Z'::timestamptz, 'SOURCE_MANIFEST.json: indicators.FP.CPI.TOTL.ZG provenance hash df9371a3b6c01e55a3f28991e62e1b1ebbe0cd2a7da94456be9938c7a2962233')
) AS seed(provider_id,provider_dataset_id,native_variable_code,canonical_code,mapping_status,concept_equivalence_grade,unit_conversion_multiplier,unit_conversion_offset,governance_review_notes,reviewed_by,reviewed_at,approval_evidence)
WHERE NOT EXISTS (SELECT 1 FROM ontology.indicator_aliases a WHERE a.provider_id=seed.provider_id AND a.provider_dataset_id=seed.provider_dataset_id AND a.native_variable_code=seed.native_variable_code)
ON CONFLICT DO NOTHING;

-- Seed the 6 Verified Provider Series for ETH/KEN from accepted EROS L2 manifest:
INSERT INTO ontology.provider_series (
    series_key, provider_id, provider_dataset_id, native_variable_code, country_iso3, country_name, canonical_code, endpoint, source_url, raw_sha256, raw_bytes, dataset_lastupdated
) VALUES
    ('ETH/SP.POP.TOTL', 'world_bank', 'WB_WDI', 'SP.POP.TOTL', 'ETH', 'Ethiopia', 'demographic_total_population',
     'https://api.worldbank.org/v2/country/ETH/indicator/SP.POP.TOTL?format=json&source=2&date=2015%3A2025&per_page=200',
     'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=ET',
     '4703cf897ecf173d20f28e58f70dffe5005b2a37cc084dad3a8931d1722caf43', 2270, '2026-10-08'),

    ('KEN/SP.POP.TOTL', 'world_bank', 'WB_WDI', 'SP.POP.TOTL', 'KEN', 'Kenya', 'demographic_total_population',
     'https://api.worldbank.org/v2/country/KEN/indicator/SP.POP.TOTL?format=json&source=2&date=2015%3A2025&per_page=200',
     'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=KE',
     '37fc962d0dcfa4c06b705d3edd680f069246214f58d9f9d906378d68a9e730e0', 2226, '2026-10-08'),

    ('ETH/NY.GDP.MKTP.KD.ZG', 'world_bank', 'WB_WDI', 'NY.GDP.MKTP.KD.ZG', 'ETH', 'Ethiopia', 'macro_real_gdp_growth_annual_pct',
     'https://api.worldbank.org/v2/country/ETH/indicator/NY.GDP.MKTP.KD.ZG?format=json&source=2&date=2015%3A2025&per_page=200',
     'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=ET',
     'f8af7ca2fa6c8b060435c374ebe04872a5812e715962a15bb5748d5d962b4da1', 2456, '2026-10-08'),

    ('KEN/NY.GDP.MKTP.KD.ZG', 'world_bank', 'WB_WDI', 'NY.GDP.MKTP.KD.ZG', 'KEN', 'Kenya', 'macro_real_gdp_growth_annual_pct',
     'https://api.worldbank.org/v2/country/KEN/indicator/NY.GDP.MKTP.KD.ZG?format=json&source=2&date=2015%3A2025&per_page=200',
     'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=KE',
     '2405e2cf1883abd1db7973c809dfe15b5de012eb5aaf62d65ae73ea61ee80fe8', 2426, '2026-10-08'),

    ('ETH/FP.CPI.TOTL.ZG', 'world_bank', 'WB_WDI', 'FP.CPI.TOTL.ZG', 'ETH', 'Ethiopia', 'macro_inflation_cpi_annual_pct',
     'https://api.worldbank.org/v2/country/ETH/indicator/FP.CPI.TOTL.ZG?format=json&source=2&date=2015%3A2025&per_page=200',
     'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=ET',
     'd903789de32cca8dfa566f416ba8c22f50bbc9412dd46de5ce0e2d589c937f3c', 2599, '2026-10-08'),

    ('KEN/FP.CPI.TOTL.ZG', 'world_bank', 'WB_WDI', 'FP.CPI.TOTL.ZG', 'KEN', 'Kenya', 'macro_inflation_cpi_annual_pct',
     'https://api.worldbank.org/v2/country/KEN/indicator/FP.CPI.TOTL.ZG?format=json&source=2&date=2015%3A2025&per_page=200',
     'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=KE',
     '06da2faaf789561488c4377b29886f6437fbd2d30838e3e358c3b8ac4589e702', 2566, '2026-10-08')
ON CONFLICT (series_key) DO NOTHING;
