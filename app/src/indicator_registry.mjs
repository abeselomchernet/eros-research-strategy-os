/**
 * EROS v1.1 Milestone C1 — Indicator Registry & Ontology Governance Service (Corrected v0.5.1-r1)
 * Manages the relational ontology ledger in PGlite / PostgreSQL:
 * canonical indicators, source providers, datasets, aliases, and provider series.
 * Strictly enforces composite provider+dataset foreign keys, approval bypass prevention,
 * immutable historical versioning/revocation, dataset-scoped lookups, and the 7 EROS Ontology Invariants.
 */

import { randomUUID } from 'node:crypto';

const VALID_DOMAINS = ['macro', 'banking', 'fintech', 'fiscal', 'enterprise', 'demographic'];
const VALID_STATUSES = ['candidate', 'approved', 'deprecated', 'rejected', 'revoked', 'superseded'];
const VALID_GRADES = ['A_EXACT', 'B_PROXY', 'C_CONDITIONAL'];

function requireDecision(reviewer, reason) {
  if (typeof reviewer !== 'string' || reviewer.trim().length < 3 || reviewer.trim() === 'unreviewed'
      || typeof reason !== 'string' || reason.trim().length < 8) {
    throw new Error('A local reviewer claim and detailed decision reason are required');
  }
}

export async function getIndicatorAliasHistory(db, aliasId) {
  return (await db.query('SELECT * FROM ontology.alias_review_events WHERE alias_id=$1 ORDER BY event_version', [aliasId])).rows;
}

/**
 * Retrieve all canonical indicators from the ontology ledger.
 */
export async function listCanonicalIndicators(db, { conceptTier = null } = {}) {
  if (conceptTier) {
    const result = await db.query(
      'SELECT * FROM ontology.canonical_indicators WHERE concept_tier = $1 ORDER BY domain, canonical_code',
      [conceptTier]
    );
    return result.rows;
  }
  const result = await db.query(
    'SELECT * FROM ontology.canonical_indicators ORDER BY domain, canonical_code'
  );
  return result.rows;
}

/**
 * Retrieve a specific canonical indicator by its unique code.
 */
export async function getCanonicalIndicator(db, canonicalCode) {
  if (!canonicalCode || typeof canonicalCode !== 'string') return null;
  const result = await db.query(
    'SELECT * FROM ontology.canonical_indicators WHERE canonical_code = $1',
    [canonicalCode]
  );
  return result.rows[0] || null;
}

/**
 * Retrieve all registered source providers.
 */
export async function listSourceProviders(db) {
  const result = await db.query(
    'SELECT * FROM ontology.source_providers ORDER BY provider_id'
  );
  return result.rows;
}

/**
 * Retrieve a source provider by its ID.
 */
export async function getSourceProvider(db, providerId) {
  if (!providerId || typeof providerId !== 'string') return null;
  const result = await db.query(
    'SELECT * FROM ontology.source_providers WHERE provider_id = $1',
    [providerId]
  );
  return result.rows[0] || null;
}

/**
 * Retrieve datasets, optionally filtered by provider.
 */
export async function listProviderDatasets(db, providerId = null) {
  if (providerId) {
    const result = await db.query(
      'SELECT * FROM ontology.provider_datasets WHERE provider_id = $1 ORDER BY dataset_id',
      [providerId]
    );
    return result.rows;
  }
  const result = await db.query(
    'SELECT * FROM ontology.provider_datasets ORDER BY provider_id, dataset_id'
  );
  return result.rows;
}

/**
 * Retrieve registered indicator aliases with canonical details.
 */
export async function listIndicatorAliases(db, { providerId = null, providerDatasetId = null, mappingStatus = null } = {}) {
  const params = [];
  const whereClauses = [];

  if (providerId) {
    params.push(providerId);
    whereClauses.push(`a.provider_id = $${params.length}`);
  }
  if (providerDatasetId) {
    params.push(providerDatasetId);
    whereClauses.push(`a.provider_dataset_id = $${params.length}`);
  }
  if (mappingStatus) {
    params.push(mappingStatus);
    whereClauses.push(`a.mapping_status = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const query = `
    SELECT
      a.alias_id,
      a.provider_id,
      a.provider_dataset_id,
      a.native_variable_code,
      a.canonical_code,
      a.mapping_status,
      a.concept_equivalence_grade,
      a.unit_conversion_multiplier,
      a.unit_conversion_offset,
      a.governance_review_notes,
      a.reviewed_by,
      a.reviewed_at,
      a.approval_evidence,
      a.version,
      a.previous_alias_id,
      a.revoked_by,
      a.revoked_at,
      a.revocation_reason,
      a.superseded_by_alias_id,
      c.name AS canonical_name,
      c.domain AS canonical_domain,
      c.unit AS canonical_unit,
      c.is_density AS canonical_is_density,
      c.required_denominator_code
    FROM ontology.indicator_aliases a
    JOIN ontology.canonical_indicators c ON c.canonical_code = a.canonical_code
    ${whereSql}
    ORDER BY a.provider_id, a.provider_dataset_id, a.native_variable_code
  `;

  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Look up an indicator alias by provider, native code, and optional dataset ID (Finding B4).
 * If providerDatasetId is omitted and multiple datasets define the same native code, throws an ambiguity error.
 */
export async function getIndicatorAlias(db, providerId, nativeVariableCode, providerDatasetId = null) {
  if (!providerId || !nativeVariableCode) return null;

  if (providerDatasetId) {
    const result = await db.query(
      `SELECT
        a.*,
        c.name AS canonical_name,
        c.domain AS canonical_domain,
        c.unit AS canonical_unit,
        c.is_density AS canonical_is_density,
        c.required_denominator_code
      FROM ontology.indicator_aliases a
      JOIN ontology.canonical_indicators c ON c.canonical_code = a.canonical_code
      WHERE a.provider_id = $1 AND a.provider_dataset_id = $2 AND a.native_variable_code = $3 AND a.mapping_status <> 'superseded'
        AND (a.mapping_status = 'approved' OR a.version = (
          SELECT max(v.version) FROM ontology.indicator_aliases v
          WHERE v.provider_id=a.provider_id AND v.provider_dataset_id=a.provider_dataset_id
            AND v.native_variable_code=a.native_variable_code))`,
      [providerId, providerDatasetId, nativeVariableCode]
    );
    if (result.rows.length > 1) {
      const err = new Error('Ambiguous alias revisions; complete reviewed supersession');
      err.code = 'DQ_AMBIGUOUS_ALIAS';
      err.matchingDatasets = [providerDatasetId];
      throw err;
    }
    return result.rows[0] || null;
  }

  // Unscoped dataset lookup: check for cross-dataset ambiguity
  const matches = await db.query(
    `SELECT
      a.*,
      c.name AS canonical_name,
      c.domain AS canonical_domain,
      c.unit AS canonical_unit,
      c.is_density AS canonical_is_density,
      c.required_denominator_code
    FROM ontology.indicator_aliases a
    JOIN ontology.canonical_indicators c ON c.canonical_code = a.canonical_code
    WHERE a.provider_id = $1 AND a.native_variable_code = $2 AND a.mapping_status <> 'superseded'
        AND (a.mapping_status = 'approved' OR a.version = (
          SELECT max(v.version) FROM ontology.indicator_aliases v
          WHERE v.provider_id=a.provider_id AND v.provider_dataset_id=a.provider_dataset_id
            AND v.native_variable_code=a.native_variable_code))`,
    [providerId, nativeVariableCode]
  );

  if (matches.rows.length > 1) {
    const datasets = matches.rows.map(r => r.provider_dataset_id).join(', ');
    const err = new Error(
      `Ambiguous indicator resolution: native code "${nativeVariableCode}" from provider "${providerId}" matches ${matches.rows.length} datasets (${datasets}). Must specify providerDatasetId.`
    );
    err.code = 'DQ_AMBIGUOUS_ALIAS';
    err.matchingDatasets = matches.rows.map(r => r.provider_dataset_id);
    throw err;
  }

  return matches.rows[0] || null;
}

/**
 * Retrieve verified provider country series.
 */
export async function listProviderSeries(db, { countryIso3 = null, canonicalCode = null, providerDatasetId = null } = {}) {
  const params = [];
  const where = [];

  if (countryIso3) {
    params.push(countryIso3);
    where.push(`country_iso3 = $${params.length}`);
  }
  if (canonicalCode) {
    params.push(canonicalCode);
    where.push(`canonical_code = $${params.length}`);
  }
  if (providerDatasetId) {
    params.push(providerDatasetId);
    where.push(`provider_dataset_id = $${params.length}`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT * FROM ontology.provider_series ${whereSql} ORDER BY series_key`,
    params
  );
  return result.rows;
}

/**
 * Resolves a native provider variable to its canonical indicator mapping.
 * Enforces:
 *   1. Unmapped codes return unregistered status with DQ_UNREGISTERED_ALIAS.
 *   2. Cross-dataset collisions without dataset qualifier return DQ_AMBIGUOUS_ALIAS.
 *   3. Candidate mappings remain held in review; cannot be used as active approved mappings.
 *   4. Approved mappings return canonical details and unit conversions.
 */
export async function resolveNativeIndicator(db, providerId, nativeVariableCode, providerDatasetId = null) {
  let alias;
  try {
    alias = await getIndicatorAlias(db, providerId, nativeVariableCode, providerDatasetId);
  } catch (err) {
    if (err.code === 'DQ_AMBIGUOUS_ALIAS') {
      return {
        status: 'ambiguous',
        isMapped: false,
        isApproved: false,
        ruleCode: 'DQ_AMBIGUOUS_ALIAS',
        message: err.message,
        matchingDatasets: err.matchingDatasets,
        remediationRecommendation: 'Specify providerDatasetId to disambiguate the indicator mapping.',
      };
    }
    throw err;
  }

  if (!alias) {
    return {
      status: 'unregistered',
      isMapped: false,
      isApproved: false,
      ruleCode: 'DQ_UNREGISTERED_ALIAS',
      message: `Native indicator code "${nativeVariableCode}" from provider "${providerId}"${providerDatasetId ? ' (dataset ' + providerDatasetId + ')' : ''} is not registered in ontology.indicator_aliases`,
      remediationRecommendation: 'Submit a candidate alias proposal with concept equivalence grade and rationale before ingesting.',
    };
  }

  if (alias.mapping_status !== 'approved') {
    return {
      status: alias.mapping_status,
      isMapped: true,
      isApproved: false,
      ruleCode: 'DQ_UNREGISTERED_ALIAS',
      aliasId: alias.alias_id,
      canonicalCode: alias.canonical_code,
      message: `Indicator mapping for "${nativeVariableCode}" exists in status "${alias.mapping_status}" and is not approved for production ingestion`,
      remediationRecommendation: 'Analyst review and signoff required to promote candidate alias to approved.',
    };
  }

  return {
    status: 'approved',
    isMapped: true,
    isApproved: true,
    aliasId: alias.alias_id,
    canonicalCode: alias.canonical_code,
    canonicalName: alias.canonical_name,
    canonicalDomain: alias.canonical_domain,
    canonicalUnit: alias.canonical_unit,
    isDensity: alias.canonical_is_density,
    requiredDenominatorCode: alias.required_denominator_code,
    conceptEquivalenceGrade: alias.concept_equivalence_grade,
    unitConversionMultiplier: alias.unit_conversion_multiplier,
    unitConversionOffset: alias.unit_conversion_offset,
  };
}

/**
 * Register a new canonical indicator in the ontology ledger.
 */
export async function registerCanonicalIndicator(db, indicator) {
  if (!indicator || typeof indicator !== 'object') {
    throw new Error('Indicator definition must be an object');
  }
  const {
    canonicalCode,
    name,
    domain,
    unit,
    direction = 'neutral',
    frequency = 'annual',
    isDensity = false,
    requiredDenominatorCode = null,
    conceptTier = 'provisional_unverified',
    methodologyDescription,
  } = indicator;

  if (!canonicalCode || typeof canonicalCode !== 'string' || !canonicalCode.trim()) {
    throw new Error('canonicalCode is required');
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('name is required');
  }
  if (!VALID_DOMAINS.includes(domain)) {
    throw new Error(`Invalid domain "${domain}". Must be one of: ${VALID_DOMAINS.join(', ')}`);
  }
  if (!unit || typeof unit !== 'string' || !unit.trim()) {
    throw new Error('unit is required');
  }
  if (!methodologyDescription || typeof methodologyDescription !== 'string') {
    throw new Error('methodologyDescription is required');
  }

  // Density rule: if is_density is true, requiredDenominatorCode should be specified
  if (isDensity && !requiredDenominatorCode) {
    throw new Error('Ontology Invariant 2 violation: density indicators require an approved denominator code');
  }

  // Adult Density Invariant (Finding B5): Adult density (per 100k adults) requires true adult population (ages 15+),
  // NOT working-age population (ages 15-64).
  if (isDensity && (unit === 'per_100k_adults' || canonicalCode.includes('adult_density'))) {
    if (requiredDenominatorCode && requiredDenominatorCode.includes('15_64')) {
      throw new Error('Ontology Invariant 2 violation: adult density metrics (per 100k adults) require true adult population (ages 15+ including elderly 65+), NOT working-age population (15-64)');
    }
  }

  // Denominator safety invariant: CAR cannot have population denominator
  if (canonicalCode === 'banking_capital_adequacy_ratio' && requiredDenominatorCode) {
    throw new Error('Ontology Invariant 2 violation: CAR denominator is Risk-Weighted Assets (RWA), NEVER population');
  }

  await db.query(
    `INSERT INTO ontology.canonical_indicators (
      canonical_code, name, domain, unit, direction, frequency, is_density, required_denominator_code, concept_tier, methodology_description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      canonicalCode.trim(),
      name.trim(),
      domain,
      unit.trim(),
      direction,
      frequency,
      Boolean(isDensity),
      requiredDenominatorCode,
      conceptTier,
      methodologyDescription.trim(),
    ]
  );

  return getCanonicalIndicator(db, canonicalCode.trim());
}

/**
 * Register a new indicator alias candidate.
 * Finding B1 Resolution: Any attempt to register an alias directly with status 'approved' is REJECTED.
 * All registrations strictly enter as 'candidate' awaiting review.
 * Finding B3 Resolution: Enforces composite provider+dataset foreign key.
 */
export async function registerIndicatorAlias(db, alias) {
  if (!alias || typeof alias !== 'object') {
    throw new Error('Alias definition must be an object');
  }
  const {
    providerId,
    providerDatasetId,
    nativeVariableCode,
    canonicalCode,
    mappingStatus = 'candidate',
    conceptEquivalenceGrade = 'A_EXACT',
    unitConversionMultiplier = 1.0,
    unitConversionOffset = 0.0,
    governanceReviewNotes = '',
    reviewedBy = 'unreviewed',
    previousAliasId = null,
    version = 1,
  } = alias;

  if (!providerId || !providerDatasetId || !nativeVariableCode || !canonicalCode) {
    throw new Error('providerId, providerDatasetId, nativeVariableCode, and canonicalCode are all required');
  }

  // B1 Blocker Fix: Direct creation of approved aliases is strictly prohibited!
  if (mappingStatus !== 'candidate') {
    throw new Error(
      "Approval bypass prohibited: external alias registration must create 'candidate' status. Use promoteIndicatorAlias() with reviewer evidence to approve."
    );
  }
  if (!VALID_STATUSES.includes(mappingStatus)) {
    throw new Error(`Invalid mappingStatus "${mappingStatus}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (!VALID_GRADES.includes(conceptEquivalenceGrade)) {
    throw new Error(`Invalid conceptEquivalenceGrade "${conceptEquivalenceGrade}". Must be one of: ${VALID_GRADES.join(', ')}`);
  }

  // B3 Blocker Fix: Enforce composite provider+dataset existence before insert
  const dsResult = await db.query(
    'SELECT dataset_id FROM ontology.provider_datasets WHERE provider_id = $1 AND dataset_id = $2',
    [providerId, providerDatasetId]
  );
  if (dsResult.rows.length === 0) {
    throw new Error(
      `Composite foreign key violation: dataset "${providerDatasetId}" does not belong to provider "${providerId}"`
    );
  }

  // Verify canonical exists
  const canonical = await getCanonicalIndicator(db, canonicalCode);
  if (!canonical) {
    throw new Error(`Referential integrity error: canonical indicator "${canonicalCode}" does not exist in ontology ledger`);
  }

  // Semantic Invariant Checks:
  // Invariant 1: FAS raw counts (FA19, FA22) cannot alias to density indicators
  if (canonical.is_density && (nativeVariableCode.includes('NUM') || nativeVariableCode === 'FA19' || nativeVariableCode === 'FA22_COMBANK')) {
    throw new Error(`Ontology Invariant 2 violation: native raw count variable "${nativeVariableCode}" cannot alias directly to density indicator "${canonicalCode}". Derivation requires approved adult population denominator.`);
  }

  // Invariant 2: NPL divided by capital (FSI17) cannot alias to NPL ratio (AQ12 / FB.AST.NPER.ZS)
  if (canonicalCode === 'banking_asset_quality_npl_ratio' && (nativeVariableCode === 'FSI17_CFSI_PT' || nativeVariableCode.includes('CAPITAL'))) {
    throw new Error(`Ontology Invariant 2 violation: variable "${nativeVariableCode}" (NPL / capital) cannot alias to NPL loan ratio indicator "${canonicalCode}" (NPL / total gross loans)`);
  }

  if (!Number.isSafeInteger(version) || version < 1) throw new Error('Invalid alias version');
  const aliasId = randomUUID();
  await db.query(
    `INSERT INTO ontology.indicator_aliases (
      alias_id, provider_id, provider_dataset_id, native_variable_code, canonical_code,
      mapping_status, concept_equivalence_grade, unit_conversion_multiplier, unit_conversion_offset,
      governance_review_notes, reviewed_by, reviewed_at, approval_evidence, version, previous_alias_id
    ) VALUES ($1, $2, $3, $4, $5, 'candidate', $6, $7, $8, $9, 'unreviewed', NULL, NULL, $10, $11)`,
    [
      aliasId,
      providerId,
      providerDatasetId,
      nativeVariableCode,
      canonicalCode,
      conceptEquivalenceGrade,
      unitConversionMultiplier,
      unitConversionOffset,
      governanceReviewNotes,
      version,
      previousAliasId,
    ]
  );

  return (await db.query('SELECT * FROM ontology.indicator_aliases WHERE alias_id=$1', [aliasId])).rows[0];
}

/**
 * Formally review and promote an indicator alias from candidate to approved.
 * Records a local reviewer claim, detailed notes and evidence; identity is not externally verified.
 */
export async function promoteIndicatorAlias(db, aliasId, reviewer, notes, evidence = '') {
  if (!aliasId) {
    throw new Error('aliasId is required to promote an alias');
  }
  if (!reviewer || typeof reviewer !== 'string' || reviewer.trim() === 'unreviewed' || reviewer.trim().length < 3) {
    throw new Error('Valid reviewer identity is required to promote an alias (cannot be unreviewed)');
  }
  if (!notes || typeof notes !== 'string' || notes.trim().length < 8) {
    throw new Error('Detailed governance review notes (minimum 8 characters) are required for promotion');
  }
  if (!evidence || typeof evidence !== 'string' || evidence.trim().length < 5) {
    throw new Error('Supporting documentation or empirical evidence reference is required for promotion');
  }

  const result = await db.query(
    `UPDATE ontology.indicator_aliases
     SET mapping_status = 'approved',
         reviewed_by = $2,
         governance_review_notes = $3,
         approval_evidence = $4,
         reviewed_at = now()
     WHERE alias_id = $1 AND mapping_status = 'candidate'
     RETURNING *`,
    [aliasId, reviewer.trim(), notes.trim(), evidence.trim()]
  );
  if (result.rows.length === 0) {
    throw new Error(`Alias ${aliasId} not found or not in candidate status`);
  }
  return result.rows[0];
}

/**
 * Reject an unreviewed candidate alias with recorded rationale.
 * Finding B2 Resolution: If the alias is already 'approved', in-place rejection is PROHIBITED.
 * Approved mappings must be revoked or superseded via revokeApprovedAlias().
 */
export async function rejectIndicatorAlias(db, aliasId, reviewer, notes) {
  requireDecision(reviewer, notes);
  if (!aliasId || !reviewer || !notes) {
    throw new Error('aliasId, reviewer, and notes are required to reject an alias');
  }

  // Check current status
  const current = (await db.query('SELECT mapping_status FROM ontology.indicator_aliases WHERE alias_id = $1', [aliasId])).rows[0];
  if (!current) {
    throw new Error(`Alias ${aliasId} not found`);
  }
  if (current.mapping_status === 'approved') {
    throw new Error(
      `Cannot reject an approved alias in-place. Approved mappings must be formally revoked via revokeApprovedAlias() to preserve audit history.`
    );
  }

  const result = await db.query(
    `UPDATE ontology.indicator_aliases
     SET mapping_status = 'rejected',
         reviewed_by = $2,
         governance_review_notes = $3,
         reviewed_at = now()
     WHERE alias_id = $1 AND mapping_status = 'candidate'
     RETURNING *`,
    [aliasId, reviewer, notes]
  );
  if (!result.rows.length) throw new Error('Alias transition rejected: missing or stale state');
  return result.rows[0];
}

/**
 * Formally revoke an approved indicator mapping while preserving historical review audit trail (Finding B2).
 */
export async function revokeApprovedAlias(db, aliasId, reviewer, reason) {
  requireDecision(reviewer, reason);
  if (!aliasId || !reviewer || !reason) {
    throw new Error('aliasId, reviewer, and reason are required to revoke an approved alias');
  }

  const current = (await db.query('SELECT mapping_status FROM ontology.indicator_aliases WHERE alias_id = $1', [aliasId])).rows[0];
  if (!current) {
    throw new Error(`Alias ${aliasId} not found`);
  }
  if (current.mapping_status !== 'approved') {
    throw new Error(`Cannot revoke alias ${aliasId}; status is "${current.mapping_status}" (must be "approved")`);
  }

  const result = await db.query(
    `UPDATE ontology.indicator_aliases
     SET mapping_status = 'revoked',
         revoked_by = $2,
         revoked_at = now(),
         revocation_reason = $3
     WHERE alias_id = $1 AND mapping_status = 'approved'
     RETURNING *`,
    [aliasId, reviewer, reason]
  );
  if (!result.rows.length) throw new Error('Alias transition rejected: missing or stale state');
  return result.rows[0];
}

/**
 * Formally supersede an approved indicator mapping with a newer versioned mapping (Finding B2).
 */
export async function supersedeApprovedAlias(db, aliasId, newAliasId, reviewer, reason) {
  requireDecision(reviewer, reason);
  if (!aliasId || !newAliasId || !reviewer || !reason) {
    throw new Error('aliasId, newAliasId, reviewer, and reason are required to supersede an approved alias');
  }

  const current = (await db.query('SELECT mapping_status FROM ontology.indicator_aliases WHERE alias_id = $1', [aliasId])).rows[0];
  if (!current) {
    throw new Error(`Alias ${aliasId} not found`);
  }
  if (current.mapping_status !== 'approved') {
    throw new Error(`Cannot supersede alias ${aliasId}; status is "${current.mapping_status}" (must be "approved")`);
  }

  const result = await db.query(
    `UPDATE ontology.indicator_aliases
     SET mapping_status = 'superseded',
         superseded_by_alias_id = $2,
         revoked_by = $3,
         revoked_at = now(),
         revocation_reason = $4
     WHERE alias_id = $1 AND mapping_status = 'approved'
     RETURNING *`,
    [aliasId, newAliasId, reviewer, reason]
  );
  if (!result.rows.length) throw new Error('Alias transition rejected: missing or stale state');
  return result.rows[0];
}
