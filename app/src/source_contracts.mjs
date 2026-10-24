/**
 * EROS v1.1 Milestone C1 — Source & Indicator Runtime Governance Contracts (Corrected v0.5.1-r1)
 * Decoupled 3-Tier Lifecycle Statuses:
 *   7 Transport / 5 Validation / 4 Approval discrete states.
 * Strictly enforces lifecycle invariants, impossible transition rejection,
 * raw-byte cryptographic preservation on parse/schema errors, and explicit
 * network and observation counter governance in pure ESM JavaScript.
 */

import { createHash } from 'node:crypto';

export const TRANSPORT_STATUSES = Object.freeze([
  'transport_success',
  'valid_empty',
  'blocked_auth',
  'rate_limited',
  'transient_failed',
  'parse_error',
  'schema_drift',
]);

export const VALIDATION_STATUSES = Object.freeze([
  'not_evaluated',
  'validation_passed',
  'validation_warnings',
  'blocked_quality',
  'quarantined',
]);

export const APPROVAL_STATUSES = Object.freeze([
  'awaiting_review',
  'reviewed_accepted',
  'reviewed_rejected',
  'superseded',
]);

export const OBSERVATION_TYPES = Object.freeze([
  'reported_actual',
  'official_estimate',
  'staff_projection',
  'reconciled_benchmark',
]);

export const DQ_RULE_CODES = Object.freeze([
  'DQ_UNREGISTERED_ALIAS',
  'DQ_AMBIGUOUS_ALIAS',
  'DQ_IQR_OUTLIER',
  'DQ_DUPLICATE_OBSERVATION',
  'DQ_INVALID_ASSESSMENT_YEAR',
  'DQ_EXCESSIVE_MISSINGNESS',
  'DQ_PUBLISHER_STALENESS',
  'DQ_UNITS_MISMATCH',
  'DQ_INVALID_DENOMINATOR',
  'DQ_RATIO_OUT_OF_BOUNDS',
]);

const SHA256_REGEX = /^[a-f0-9]{64}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO3_REGEX = /^[A-Z]{3}$/;

/**
 * Validates any Ingestion Run Result object against the 4 EROS Lifecycle Invariants
 * and explicit counter rules. Throws descriptive Error on invariant violation.
 */
export function validateRunResult(run) {
  if (!run || typeof run !== 'object') {
    throw new Error('Contract violation: run result must be an object');
  }

  // Common metadata validation
  if (typeof run.runId !== 'string' || !UUID_REGEX.test(run.runId)) {
    throw new Error('Contract violation: runId must be a valid UUID');
  }
  if (typeof run.providerId !== 'string' || !run.providerId.trim()) {
    throw new Error('Contract violation: providerId must be a non-empty string');
  }
  if (typeof run.datasetId !== 'string' || !run.datasetId.trim()) {
    throw new Error('Contract violation: datasetId must be a non-empty string');
  }
  if (!run.startedAtUtc || isNaN(Date.parse(run.startedAtUtc))) {
    throw new Error('Contract violation: startedAtUtc must be a valid ISO 8601 timestamp');
  }
  if (!run.finishedAtUtc || isNaN(Date.parse(run.finishedAtUtc))) {
    throw new Error('Contract violation: finishedAtUtc must be a valid ISO 8601 timestamp');
  }
  if (Date.parse(run.finishedAtUtc) < Date.parse(run.startedAtUtc)) {
    throw new Error('Contract violation: finishedAtUtc cannot precede startedAtUtc');
  }

  // Validate status taxonomy existence
  if (!TRANSPORT_STATUSES.includes(run.transportStatus)) {
    throw new Error(`Contract violation: unknown transportStatus "${run.transportStatus}". Must be one of 7 defined states.`);
  }
  if (!VALIDATION_STATUSES.includes(run.validationStatus)) {
    throw new Error(`Contract violation: unknown validationStatus "${run.validationStatus}". Must be one of 5 defined states.`);
  }
  if (run.approvalStatus !== null && !APPROVAL_STATUSES.includes(run.approvalStatus)) {
    throw new Error(`Contract violation: unknown approvalStatus "${run.approvalStatus}". Must be null or one of 4 defined states.`);
  }

  // Explicit Counter Validation (Finding B7)
  for (const field of ['requestAttemptCount', 'responsesReceived', 'parsedObservations',
    'acceptedObservations', 'rejectedObservations', 'persistedRawCaptures',
    'recordsAttempted', 'recordsLoaded', 'recordsRejected']) {
    if (run[field] !== undefined && (!Number.isSafeInteger(run[field]) || run[field] < 0)) {
      throw new Error(`Contract violation: ${field} must be a non-negative integer within the safe numeric range`);
    }
  }
  const reqAttempts = run.requestAttemptCount ?? (run.transportStatus ? 1 : 0);
  if (typeof reqAttempts !== 'number' || reqAttempts < 0) {
    throw new Error('Contract violation: requestAttemptCount must be a non-negative integer');
  }
  const resReceived = run.responsesReceived ?? (['transport_success', 'valid_empty', 'parse_error', 'schema_drift'].includes(run.transportStatus) ? 1 : 0);
  if (typeof resReceived !== 'number' || resReceived < 0) {
    throw new Error('Contract violation: responsesReceived must be a non-negative integer');
  }
  if (resReceived > reqAttempts) {
    throw new Error('Contract violation: responsesReceived cannot exceed requestAttemptCount');
  }
  if (['transport_success', 'valid_empty'].includes(run.transportStatus) && (reqAttempts < 1 || resReceived < 1)) {
    throw new Error('Contract violation: successful transport requires at least one request attempt and received response');
  }
  if (resReceived === 0 && run.rawCaptureSha256 != null) {
    throw new Error('Invariant 1 violation: run without response body cannot retain raw capture hash; use a separate archive replay');
  }
  if ((run.persistedRawCaptures ?? 0) > resReceived) {
    throw new Error('Contract violation: persistedRawCaptures cannot exceed responsesReceived');
  }

  // Map legacy record aliases to observation counters
  const counter = (canonical, legacy) => {
    if (run[canonical] !== undefined && run[legacy] !== undefined && run[canonical] !== run[legacy]) {
      throw new Error(`Invariant 1 violation: records aliases ${canonical} and ${legacy} must agree`);
    }
    return run[canonical] ?? run[legacy] ?? 0;
  };
  const parsedObs = counter('parsedObservations', 'recordsAttempted');
  const acceptedObs = counter('acceptedObservations', 'recordsLoaded');
  const rejectedObs = counter('rejectedObservations', 'recordsRejected');

  // INVARIANT 1: Transport Failure Isolation
  // IF transportStatus is not transport_success and not valid_empty:
  // THEN validationStatus MUST BE 'not_evaluated' AND approvalStatus MUST BE null.
  const isTransportFailure = run.transportStatus !== 'transport_success' && run.transportStatus !== 'valid_empty';
  if (isTransportFailure) {
    if (run.validationStatus !== 'not_evaluated') {
      throw new Error(`Invariant 1 violation (Transport Failure Isolation): transport failed with "${run.transportStatus}", but validationStatus was "${run.validationStatus}" (must be "not_evaluated")`);
    }
    if (run.approvalStatus !== null) {
      throw new Error(`Invariant 1 violation (Transport Failure Isolation): transport failed with "${run.transportStatus}", but approvalStatus was "${run.approvalStatus}" (must be null)`);
    }
    if (parsedObs !== 0 || acceptedObs !== 0 || rejectedObs !== 0) {
      throw new Error(`Invariant 1 violation: failed transport cannot report loaded or parsed records/observations > 0`);
    }

    // Finding B6 Resolution: Preserve raw capture cryptographic hash when response body was received!
    // For parse_error and schema_drift: response was received, so rawCaptureSha256 MAY be preserved.
    // For pure socket failures where responsesReceived === 0, rawCaptureSha256 MUST be null.
    if (['parse_error', 'schema_drift'].includes(run.transportStatus)) {
      if (run.rawCaptureSha256 !== null) {
        if (typeof run.rawCaptureSha256 !== 'string' || !SHA256_REGEX.test(run.rawCaptureSha256)) {
          throw new Error('Contract violation: retained rawCaptureSha256 on parse_error/schema_drift must be a valid 64-char lowercase hex hash');
        }
      }
    } else {
      // Pure socket or unauthenticated drop where no payload was retrieved
      if (resReceived === 0 && run.rawCaptureSha256 !== null) {
        throw new Error(`Invariant 1 violation: transport failure without response body cannot retain raw capture hash`);
      }
    }

    if (typeof run.errorMessage !== 'string' || !run.errorMessage.trim()) {
      throw new Error(`Invariant 1 violation: failed transport must report a non-empty errorMessage`);
    }
    return { valid: true, type: 'transport_failure' };
  }

  // INVARIANT 2: Valid Empty Isolation
  // IF transportStatus is 'valid_empty':
  // THEN validationStatus MUST BE 'not_evaluated' AND approvalStatus MUST BE null.
  if (run.transportStatus === 'valid_empty') {
    if (run.validationStatus !== 'not_evaluated') {
      throw new Error(`Invariant 2 violation (Valid Empty Isolation): valid empty transport cannot have validationStatus "${run.validationStatus}" (must be "not_evaluated")`);
    }
    if (run.approvalStatus !== null) {
      throw new Error(`Invariant 2 violation (Valid Empty Isolation): valid empty transport cannot have approvalStatus "${run.approvalStatus}" (must be null)`);
    }
    if (parsedObs !== 0 || acceptedObs !== 0 || rejectedObs !== 0) {
      throw new Error(`Invariant 2 violation: valid empty transport must have parsedObservations=0 and acceptedObservations=0`);
    }
    if (typeof run.rawCaptureSha256 !== 'string' || !SHA256_REGEX.test(run.rawCaptureSha256)) {
      throw new Error(`Invariant 2 violation: valid empty transport must retain raw capture envelope sha256`);
    }
    if (run.errorMessage !== null) {
      throw new Error(`Invariant 2 violation: valid empty transport cannot report an errorMessage`);
    }
    return { valid: true, type: 'valid_empty' };
  }

  // INVARIANT 3: Quality Failure Promotion Blocker
  // IF validationStatus IN ('blocked_quality', 'quarantined')
  // THEN approvalStatus MUST BE null (cannot be staged or approved).
  if (['blocked_quality', 'quarantined'].includes(run.validationStatus)) {
    if (run.approvalStatus !== null) {
      throw new Error(`Invariant 3 violation (Quality Failure Promotion Blocker): validationStatus "${run.validationStatus}" prohibits staging or approval; approvalStatus must be null, but got "${run.approvalStatus}"`);
    }
  }

  // INVARIANT 4: Promotion Eligibility Gate
  // approvalStatus CANNOT BE 'awaiting_review' OR 'reviewed_accepted'
  // UNLESS transportStatus === 'transport_success'
  // AND validationStatus IN ('validation_passed', 'validation_warnings').
  if (['awaiting_review', 'reviewed_accepted'].includes(run.approvalStatus)) {
    if (run.transportStatus !== 'transport_success') {
      throw new Error(`Invariant 4 violation (Promotion Eligibility Gate): cannot stage/accept run with transportStatus "${run.transportStatus}"`);
    }
    if (!['validation_passed', 'validation_warnings'].includes(run.validationStatus)) {
      throw new Error(`Invariant 4 violation (Promotion Eligibility Gate): cannot stage/accept run with validationStatus "${run.validationStatus}"`);
    }
  }

  // For success runs, verify observation counters and raw hash
  if (typeof parsedObs !== 'number' || parsedObs < 0) {
    throw new Error('Contract violation: parsedObservations must be a non-negative integer');
  }
  if (typeof acceptedObs !== 'number' || acceptedObs < 0) {
    throw new Error('Contract violation: acceptedObservations must be a non-negative integer');
  }
  if (typeof rejectedObs !== 'number' || rejectedObs < 0) {
    throw new Error('Contract violation: rejectedObservations must be a non-negative integer');
  }
  if (acceptedObs + rejectedObs > parsedObs) {
    throw new Error('Contract violation: accepted + rejected observations cannot exceed parsedObservations');
  }
  if (typeof run.rawCaptureSha256 !== 'string' || !SHA256_REGEX.test(run.rawCaptureSha256)) {
    throw new Error('Contract violation: success run must report a valid 64-char lowercase hex rawCaptureSha256');
  }

  return { valid: true, type: 'ingest_success' };
}

/**
 * Verify a local archived capture separately from current-run acquisition.
 */
export function validateArchiveReplay(replay) {
  if (!replay || replay.kind !== 'archive_replay' || replay.requestAttemptCount !== 0 || replay.responsesReceived !== 0) {
    throw new Error('Archive replay must be separate from network acquisition and report zero current requests/responses');
  }
  validateRunResult(replay.priorRun);
  if (!(replay.rawBytes instanceof Uint8Array) || !replay.priorRun.rawCaptureSha256 ||
      createHash('sha256').update(replay.rawBytes).digest('hex') !== replay.priorRun.rawCaptureSha256) {
    throw new Error('Archive replay bytes must match the validated prior run capture hash');
  }
  return { valid: true, type: 'archive_replay', priorRunId: replay.priorRun.runId,
    rawCaptureSha256: replay.priorRun.rawCaptureSha256 };
}

export function createTransportFailureResult({
  runId,
  providerId,
  datasetId,
  startedAtUtc,
  finishedAtUtc,
  transportStatus,
  httpStatusCode = null,
  errorMessage,
  requestAttemptCount = 1,
  responsesReceived = 0,
  rawCaptureSha256 = null,
  persistedRawCaptures = 0,
  diagnosticDetails = {},
}) {
  if (transportStatus === 'transport_success' || transportStatus === 'valid_empty') {
    throw new Error(`createTransportFailureResult called with non-failure status: ${transportStatus}`);
  }
  const result = {
    runId,
    providerId,
    datasetId,
    startedAtUtc,
    finishedAtUtc,
    httpStatusCode,
    transportStatus,
    validationStatus: 'not_evaluated',
    approvalStatus: null,
    requestAttemptCount,
    responsesReceived,
    parsedObservations: 0,
    acceptedObservations: 0,
    rejectedObservations: 0,
    persistedRawCaptures,
    recordsAttempted: 0,
    recordsLoaded: 0,
    recordsRejected: 0,
    rawCaptureSha256,
    errorMessage,
    diagnosticDetails,
  };
  validateRunResult(result);
  return Object.freeze(result);
}

/**
 * Factory for creating a strictly compliant ValidEmptyRunResult
 */
export function createValidEmptyResult({
  runId,
  providerId,
  datasetId,
  startedAtUtc,
  finishedAtUtc,
  httpStatusCode = 200,
  rawCaptureSha256,
  requestAttemptCount = 1,
  responsesReceived = 1,
  diagnosticDetails = {},
}) {
  const result = {
    runId,
    providerId,
    datasetId,
    startedAtUtc,
    finishedAtUtc,
    httpStatusCode,
    transportStatus: 'valid_empty',
    validationStatus: 'not_evaluated',
    approvalStatus: null,
    requestAttemptCount,
    responsesReceived,
    parsedObservations: 0,
    acceptedObservations: 0,
    rejectedObservations: 0,
    persistedRawCaptures: 1,
    recordsAttempted: 0,
    recordsLoaded: 0,
    recordsRejected: 0,
    rawCaptureSha256,
    errorMessage: null,
    diagnosticDetails,
  };
  validateRunResult(result);
  return Object.freeze(result);
}

/**
 * Factory for creating a strictly compliant IngestSuccessRunResult
 */
export function createIngestSuccessResult({
  runId,
  providerId,
  datasetId,
  startedAtUtc,
  finishedAtUtc,
  httpStatusCode = 200,
  validationStatus,
  approvalStatus = null,
  parsedObservations,
  acceptedObservations,
  rejectedObservations,
  rawCaptureSha256,
  requestAttemptCount = 1,
  responsesReceived = 1,
  persistedRawCaptures = 1,
  recordsAttempted,
  recordsLoaded,
  recordsRejected,
  errorMessage = null,
  diagnosticDetails = {},
}) {
  if (validationStatus === 'not_evaluated') {
    throw new Error('createIngestSuccessResult requires an evaluated validationStatus');
  }
  const parsed = parsedObservations ?? recordsAttempted ?? 0;
  const accepted = acceptedObservations ?? recordsLoaded ?? 0;
  const rejected = rejectedObservations ?? recordsRejected ?? 0;

  const result = {
    runId,
    providerId,
    datasetId,
    startedAtUtc,
    finishedAtUtc,
    httpStatusCode,
    transportStatus: 'transport_success',
    validationStatus,
    approvalStatus,
    requestAttemptCount,
    responsesReceived,
    parsedObservations: parsed,
    acceptedObservations: accepted,
    rejectedObservations: rejected,
    persistedRawCaptures,
    recordsAttempted: recordsAttempted ?? parsed,
    recordsLoaded: recordsLoaded ?? accepted,
    recordsRejected: recordsRejected ?? rejected,
    rawCaptureSha256,
    errorMessage,
    diagnosticDetails,
  };
  validateRunResult(result);
  return Object.freeze(result);
}

/**
 * Validates a single NormalizedObservation against EROS ontological rules and invariants.
 */
export function validateObservation(obs) {
  if (!obs || typeof obs !== 'object') {
    throw new Error('Observation must be an object');
  }
  if (typeof obs.seriesKey !== 'string' || !/^[A-Z]{3}\/[A-Za-z0-9_.-]+$/.test(obs.seriesKey)) {
    throw new Error(`Invalid seriesKey format: "${obs.seriesKey}". Expected "{countryIso3}/{indicator}"`);
  }
  if (!ISO3_REGEX.test(obs.countryIso3)) {
    throw new Error(`Invalid countryIso3: "${obs.countryIso3}". Expected 3-letter uppercase ISO code.`);
  }
  if (!obs.seriesKey.startsWith(obs.countryIso3 + '/')) {
    throw new Error(`seriesKey "${obs.seriesKey}" does not match countryIso3 "${obs.countryIso3}"`);
  }
  if (typeof obs.canonicalIndicatorCode !== 'string' || !obs.canonicalIndicatorCode.trim()) {
    throw new Error('Missing canonicalIndicatorCode');
  }
  if (typeof obs.rawIndicatorCode !== 'string' || !obs.rawIndicatorCode.trim()) {
    throw new Error('Missing rawIndicatorCode');
  }
  if (typeof obs.year !== 'number' || !Number.isInteger(obs.year)) {
    throw new Error(`Invalid year: "${obs.year}". Must be an integer.`);
  }
  if (obs.numericValue !== null) {
    if (typeof obs.numericValue !== 'number' || !Number.isFinite(obs.numericValue)) {
      throw new Error(`Invalid numericValue: "${obs.numericValue}". NaN or Infinity prohibited.`);
    }
  }
  if (!OBSERVATION_TYPES.includes(obs.observationType)) {
    throw new Error(`Invalid observationType "${obs.observationType}". Must be one of: ${OBSERVATION_TYPES.join(', ')}`);
  }
  if (!['high', 'medium', 'low'].includes(obs.confidenceTier)) {
    throw new Error(`Invalid confidenceTier "${obs.confidenceTier}". Must be high, medium, or low.`);
  }
  if (typeof obs.rawSha256 !== 'string' || !SHA256_REGEX.test(obs.rawSha256)) {
    throw new Error('Invalid rawSha256 cryptographic anchor');
  }

  // Semantic Invariant Checks:
  // Invariant 1: SP.POP.1564.TO is working-age population 15-64, NOT adult population 15+
  if (obs.rawIndicatorCode === 'SP.POP.1564.TO' || obs.canonicalIndicatorCode === 'demographic_working_age_population_15_64') {
    if (obs.denominatorNotes && obs.denominatorNotes.toLowerCase().includes('15+')) {
      throw new Error('Semantic invariant violation: SP.POP.1564.TO is population ages 15-64, not age 15+');
    }
  }

  // Invariant 2: Adult density requires an adult population denominator (ages 15+), NOT working-age (15-64)
  if (obs.canonicalIndicatorCode.includes('adult_density') || obs.unit === 'per_100k_adults') {
    if (obs.denominatorNotes && (obs.denominatorNotes.includes('1564') || obs.denominatorNotes.includes('15-64'))) {
      throw new Error('Semantic invariant violation: adult density metrics (per 100k adults) require true adult population (15+ including 65+), not working-age (15-64)');
    }
  }

  // Invariant 3: CAR denominator must be Risk-Weighted Assets (RWA), NEVER population
  if (obs.canonicalIndicatorCode === 'banking_capital_adequacy_ratio') {
    if (obs.denominatorNotes && (obs.denominatorNotes.toLowerCase().includes('population') || obs.denominatorNotes.toLowerCase().includes('per 100k'))) {
      throw new Error('Semantic invariant violation: CAR denominator is Risk-Weighted Assets (RWA), NEVER population');
    }
  }

  return { valid: true };
}

/**
 * Validates a Data Quality (DQ) Finding record.
 */
export function validateDQFinding(finding) {
  if (!finding || typeof finding !== 'object') {
    throw new Error('DQ finding must be an object');
  }
  if (typeof finding.findingId !== 'string' || !UUID_REGEX.test(finding.findingId)) {
    throw new Error('Invalid DQ findingId; must be a UUID');
  }
  if (!['blocker', 'warning', 'info'].includes(finding.severity)) {
    throw new Error(`Invalid DQ severity "${finding.severity}". Must be blocker, warning, or info.`);
  }
  if (!DQ_RULE_CODES.includes(finding.ruleCode)) {
    throw new Error(`Unknown DQ ruleCode "${finding.ruleCode}".`);
  }
  if (typeof finding.affectedSeriesKey !== 'string' || !finding.affectedSeriesKey.trim()) {
    throw new Error('DQ finding requires an affectedSeriesKey');
  }
  if (typeof finding.message !== 'string' || !finding.message.trim()) {
    throw new Error('DQ finding requires a descriptive message');
  }
  if (typeof finding.remediationRecommendation !== 'string') {
    throw new Error('DQ finding requires remediationRecommendation');
  }
  return { valid: true };
}

/**
 * Summarizes DQ findings for candidate promotion evaluation.
 */
export function summarizeDQFindings(findings, totalChecked = 0) {
  if (!Array.isArray(findings)) {
    throw new Error('findings must be an array');
  }
  for (const f of findings) {
    validateDQFinding(f);
  }
  const blockersCount = findings.filter(f => f.severity === 'blocker').length;
  const warningsCount = findings.filter(f => f.severity === 'warning').length;
  return {
    totalObservationsChecked: Math.max(totalChecked, findings.length),
    blockersCount,
    warningsCount,
    isEligibleForPromotion: blockersCount === 0,
    findings: [...findings],
  };
}
