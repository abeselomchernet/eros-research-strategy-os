/**
 * EROS v1.1 — Milestone C1 Source and Indicator Governance Contracts (Corrected v0.5.1-r1)
 * Decoupled 3-Tier Lifecycles (7 Transport / 5 Validation / 4 Approval discrete states),
 * discriminated run outcomes with explicit network request and observation counters,
 * composite dataset identity constraints, and immutable versioned alias governance.
 */

/**
 * 1. Transport & Fetch Execution Status (7 discrete states)
 * Reflects the network, protocol, and parser outcome of the HTTP request.
 */
export type TransportStatus =
  | 'transport_success' // Successful response parsed; >=1 request and response (not restricted to HTTP 200)
  | 'valid_empty'       // Successful well-formed response, zero observations; >=1 request and response
  | 'blocked_auth'      // HTTP 401/403: unauthorized, credential missing, or invalid subscription key
  | 'rate_limited'      // HTTP 429: rate limit exceeded; contains Retry-After backoff window
  | 'transient_failed'  // Network socket timeout (ECONNRESET, ETIMEDOUT) or HTTP 502/503/504
  | 'parse_error'       // Body payload corrupted, invalid JSON, or truncated stream (raw bytes preserved)
  | 'schema_drift';     // Response envelope structure broke parser dimension assumptions (raw bytes preserved)

/**
 * 2. Evidence Validation & Data Quality Status (5 discrete states)
 * Reflects automated statistical and ontological integrity checks on parsed data.
 */
export type ValidationStatus =
  | 'not_evaluated'       // Request did not reach validation (e.g. transport failure or valid empty)
  | 'validation_passed'   // Passed all DQ rules, alias foreign keys, and year bounds
  | 'validation_warnings' // Passed critical checks, but non-fatal findings flagged (e.g. IQR outlier)
  | 'blocked_quality'     // Critical data quality failure (e.g. unmapped alias, negative counts)
  | 'quarantined';        // Severe schema or data corruption; isolated from review queue

/**
 * 3. Analyst Review & Promotion Status (4 discrete states)
 * Reflects human governance decisions regarding the candidate evidence.
 */
export type ApprovalStatus =
  | 'awaiting_review'   // Staged candidate waiting for analyst evaluation
  | 'reviewed_accepted' // Analyst confirmed and promoted candidate to accepted source_snapshots
  | 'reviewed_rejected' // Analyst discarded candidate with recorded rationale
  | 'superseded';       // Previously accepted snapshot replaced by a newer publisher vintage

/**
 * Base metadata common to all ingestion run execution results.
 * Includes explicit network attempt and observation counters (Finding B7).
 */
export interface BaseRunMetadata {
  runId: string;                     // UUID v4
  providerId: string;                // e.g. 'world_bank', 'imf'
  datasetId: string;                 // e.g. 'WB_WDI', 'IMF_WEO'
  startedAtUtc: string;              // ISO 8601 UTC
  finishedAtUtc: string;             // ISO 8601 UTC
  httpStatusCode: number | null;

  // Explicit Network & Acquisition Counters
  requestAttemptCount: number;       // Nonnegative safe integer; >= responsesReceived; success requires >=1
  responsesReceived: number;         // HTTP responses received (0 on timeout, 1 on 401/403/429/500/200)
  parsedObservations: number;        // Observations successfully parsed from response payload
  acceptedObservations: number;      // Observations passed and approved
  rejectedObservations: number;      // Observations rejected by quality validation
  persistedRawCaptures: number;      // Raw response capture packets saved to storage (0 or 1)

  // Runtime accepts one-sided legacy/canonical counters via nullish fallback to 0.
  // When both aliases are supplied they MUST agree; no input mutation/Math.max.
  // Factories emit both consistently; network defaults preserve legacy compatibility.
  recordsAttempted: number;          // Mapped to parsedObservations
  recordsLoaded: number;             // Mapped to acceptedObservations
  recordsRejected: number;           // Mapped to rejectedObservations

  diagnosticDetails?: Record<string, unknown>;
}

/**
 * Run outcome when HTTP or transport layer fails.
 * Invariant 1: validationStatus MUST be 'not_evaluated' and approvalStatus MUST be null.
 * Finding B6: rawCaptureSha256 is null on socket/auth drops, but preserved on parse_error/schema_drift!
 */
export interface TransportFailureRunResult extends BaseRunMetadata {
  transportStatus: Exclude<TransportStatus, 'transport_success' | 'valid_empty'>;
  validationStatus: 'not_evaluated';
  approvalStatus: null;              // Lifecycle stage not reached
  parsedObservations: 0;
  acceptedObservations: 0;
  rejectedObservations: 0;
  recordsAttempted: 0;
  recordsLoaded: 0;
  recordsRejected: 0;
  rawCaptureSha256: string | null;   // Retained if raw response bytes were received before parse error
  errorMessage: string;
}

/**
 * Run outcome when HTTP succeeds but returns an empty payload.
 * Invariant 2: validationStatus MUST be 'not_evaluated' and approvalStatus MUST be null.
 */
export interface ValidEmptyRunResult extends BaseRunMetadata {
  transportStatus: 'valid_empty';
  validationStatus: 'not_evaluated';
  approvalStatus: null;              // Lifecycle stage not reached
  parsedObservations: 0;
  acceptedObservations: 0;
  rejectedObservations: 0;
  recordsAttempted: 0;
  recordsLoaded: 0;
  recordsRejected: 0;
  persistedRawCaptures: 1;
  rawCaptureSha256: string;          // Cryptographic hash of well-formed empty response
  errorMessage: null;
}

/**
 * Run outcome when HTTP succeeds and body is successfully parsed.
 * Invariant 3: If validationStatus IN ('blocked_quality', 'quarantined'), approvalStatus MUST be null.
 * Invariant 4: approvalStatus cannot be 'awaiting_review' or 'reviewed_accepted' unless validation passed/warnings.
 */
export interface IngestSuccessRunResult extends BaseRunMetadata {
  transportStatus: 'transport_success';
  validationStatus: Exclude<ValidationStatus, 'not_evaluated'>;
  approvalStatus: ApprovalStatus | null;
  rawCaptureSha256: string;          // SHA-256 of raw HTTP response bytes
  errorMessage: string | null;
}

export type IngestRunResult =
  | TransportFailureRunResult
  | ValidEmptyRunResult
  | IngestSuccessRunResult;

/** Local archive verification, distinct from any new network run or approval.
 * Runtime validates priorRun and hashes rawBytes against its retained capture.
 * This verifies supplied bytes and metadata, not external provenance or identity.
 */
export interface ArchiveReplay {
  kind: 'archive_replay';
  priorRun: IngestRunResult;
  rawBytes: Uint8Array;
  requestAttemptCount: 0;
  responsesReceived: 0;
}

/**
 * Provider & Dataset Registry Definitions
 */
export type ProviderTier = 'multilateral' | 'regional' | 'national_authority' | 'academic_industry';
export type SyncFrequency = 'daily' | 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'triennial' | 'ad_hoc';
export type RightsStatus = 'public_open_access' | 'cc_by_4_0' | 'third_party_exceptions_pending_review' | 'restricted_permission_required';

export interface SourceProviderDefinition {
  providerId: string;
  name: string;
  organization: string;
  tier: ProviderTier;
  baseUrl: string;
  documentationUrl: string;
  termsOfUseUrl: string;
  defaultRightsStatus: RightsStatus;
  requiresAuthentication: boolean;
  authHeaderName?: string;
  rateLimitRules?: {
    maxRequestsPerMinute: number;
    backoffBaseSeconds: number;
    maxRetries: number;
  };
}

export interface DatasetDefinition {
  datasetId: string;
  providerId: string;
  datasetName: string;
  description: string;
  protocol: 'rest_json' | 'sdmx_3_0_json' | 'sdmx_2_1_json' | 'csv_bulk';
  endpointTemplate: string;
  frequency: SyncFrequency;
  nativeFrequencyCode: string;
  defaultConfidenceTier: 'high' | 'medium' | 'low';
  lastKnownVintage: string | null;
  isActive: boolean;
}

/**
 * Immutable Raw Capture Packet Definitions
 */
export interface RawCaptureEntry {
  endpoint: string;
  retrievedAtUtc: string;
  httpStatus: number;
  responseHeaders?: Record<string, string>;
  rawBytes: number;
  rawSha256: string;
  rawBase64: string;
}

export interface RawCandidatePacket {
  schema: 'eros-raw-candidate-v1' | 'eros-l5-wdi-candidate-v1';
  packetId: string;
  providerId: string;
  datasetId: string;
  capturedAtUtc: string;
  responses: RawCaptureEntry[];
  summary: {
    totalBytes: number;
    responseCount: number;
    seriesCount: number;
    observationCount: number;
  };
}

/**
 * Normalized Observation Contract
 */
export type ObservationType = 'reported_actual' | 'official_estimate' | 'staff_projection' | 'reconciled_benchmark';

export interface NormalizedObservation {
  seriesKey: string;                 // Canonical compound key: '{countryIso3}/{canonicalIndicatorCode}'
  countryIso3: string;               // ISO 3166-1 alpha-3 code (e.g. 'ETH', 'KEN')
  canonicalIndicatorCode: string;    // Resolved canonical code in ontology.indicator_aliases
  rawIndicatorCode: string;          // Native publisher variable code (e.g. 'NY.GDP.MKTP.KD.ZG')
  period: string;                    // Standardized period: '2025' (Annual), '2025-Q1' (Quarterly)
  year: number;                      // Integer assessment year
  numericValue: number | null;       // Null represents verified publisher missingness (NaN prohibited)
  unit: string | null;               // e.g. '%', 'raw_count', 'USD_per_capita'
  observationType: ObservationType;  // Explicit separation of historical observations from forecasts
  confidenceTier: 'high' | 'medium' | 'low';
  sourceId: string;                  // e.g. 'world_bank', 'imf'
  datasetId: string;                 // e.g. 'WB_WDI', 'IMF_WEO'
  sourceUrl: string;                 // Direct reference URL for human verification
  rawSha256: string;                 // Cryptographic anchor to RawCaptureEntry
  publisherDatasetLastUpdated: string | null; // Publisher vintage date (distinct from retrieval date)
  methodologyNotes?: string;
  denominatorNotes?: string;
}

/**
 * Data Quality (DQ) Findings Contract
 */
export type DQSeverity = 'blocker' | 'warning' | 'info';
export type DQRuleCode =
  | 'DQ_UNREGISTERED_ALIAS'     // Indicator code not found in ontology.indicator_aliases
  | 'DQ_AMBIGUOUS_ALIAS'        // Native code matches multiple datasets without dataset qualifier
  | 'DQ_IQR_OUTLIER'            // Value deviates > 3 * IQR from distribution
  | 'DQ_DUPLICATE_OBSERVATION'  // Identical country/indicator/year already present in staging
  | 'DQ_INVALID_ASSESSMENT_YEAR'// Year outside plausible macroeconomic window (1990 <= year <= current + 10)
  | 'DQ_EXCESSIVE_MISSINGNESS'  // > 50% of expected panel time points are null
  | 'DQ_PUBLISHER_STALENESS'    // Series has not been updated upstream in > 3 years
  | 'DQ_UNITS_MISMATCH'         // Incompatible unit (e.g. raw count passed to density indicator)
  | 'DQ_INVALID_DENOMINATOR'    // Denominator violation (e.g. applying adult population to CAR instead of RWA)
  | 'DQ_RATIO_OUT_OF_BOUNDS';   // Ratio outside valid bounds (e.g. CAR < 0 or > 100%, negative NPL)

export interface DQFinding {
  findingId: string;
  candidateId: string;
  severity: DQSeverity;
  ruleCode: DQRuleCode;
  affectedSeriesKey: string;
  affectedYear?: number;
  observedValue?: number | string | null;
  message: string;
  remediationRecommendation: string;
}

export interface DQSummaryProfile {
  totalObservationsChecked: number;
  blockersCount: number;
  warningsCount: number;
  isEligibleForPromotion: boolean;   // False if blockersCount > 0
  findings: DQFinding[];
}

/**
 * Ontology Ledger Model Types
 */
export interface CanonicalIndicator {
  canonicalCode: string;
  name: string;
  domain: 'macro' | 'banking' | 'fintech' | 'fiscal' | 'enterprise' | 'demographic';
  unit: string;
  direction: 'positive' | 'negative' | 'neutral';
  frequency: 'annual' | 'quarterly' | 'monthly' | 'triennial' | 'ad_hoc';
  isDensity: boolean;
  requiredDenominatorCode: string | null;
  conceptTier: 'archived_verified' | 'provisional_unverified';
  methodologyDescription: string;
  createdAt?: string;
}

export type AliasMappingStatus = 'candidate' | 'approved' | 'deprecated' | 'rejected' | 'revoked' | 'superseded';
export type ConceptEquivalenceGrade = 'A_EXACT' | 'B_PROXY' | 'C_CONDITIONAL';

export interface IndicatorAlias {
  aliasId: string;
  providerId: string;
  providerDatasetId: string;
  nativeVariableCode: string;
  canonicalCode: string;
  mappingStatus: AliasMappingStatus;
  conceptEquivalenceGrade: ConceptEquivalenceGrade;
  unitConversionMultiplier: number;
  unitConversionOffset: number;
  governanceReviewNotes: string;
  reviewedBy: string;
  reviewedAt: string | null;
  approvalEvidence: string | null;
  version: number;
  revokedBy?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  supersededByAliasId?: string | null;
  createdAt?: string;
}

export interface ProviderSeries {
  seriesKey: string;
  providerId: string;
  providerDatasetId: string;
  nativeVariableCode: string;
  countryIso3: string;
  countryName: string;
  canonicalCode: string;
  endpoint: string;
  sourceUrl: string;
  rawSha256: string | null;
  rawBytes: number | null;
  datasetLastupdated: string | null;
  createdAt?: string;
}
