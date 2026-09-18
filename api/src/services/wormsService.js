/**
 * wormsService.js
 *
 * WoRMS (World Register of Marine Species) REST client.
 * Provides taxonomy lookup with persistent Neo4j cache, in-flight deduplication,
 * and graceful fallback when the service is unavailable.
 *
 * The service NEVER throws errors that should block diagnosis flow.
 * All failures are returned as structured results with availability metadata.
 */

const { getSession } = require("../db/neo4j");

// ── Configuration ─────────────────────────────────────────────────────────
const BASE_URL = process.env.WORMS_BASE_URL || "https://www.marinespecies.org/rest";
const TIMEOUT_MS = parseInt(process.env.WORMS_TIMEOUT, 10) || 3000;
const CACHE_DAYS = parseInt(process.env.WORMS_CACHE_DAYS, 10) || 7;
const CACHE_MS = CACHE_DAYS * 24 * 60 * 60 * 1000;

// ── In-flight request deduplication ───────────────────────────────────────
const inflightMap = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalize WoRMS boolean fields.
 * 1, "1", true  → true
 * 0, "0", false → false
 * null/undefined/unknown → null
 */
function normalizeBool(val) {
  if (val === true || val === 1 || val === "1") return true;
  if (val === false || val === 0 || val === "0") return false;
  return null;
}

/**
 * Extract taxonomy ranks from WoRMS classification tree.
 * Case-insensitive rank matching.
 */
function extractClassification(classification) {
  if (!classification) return { order: null, superfamily: null, family: null, genus: null };

  const result = { order: null, superfamily: null, family: null, genus: null };
  const targetRanks = { order: "order", superfamily: "superfamily", family: "family", genus: "genus" };

  // Walk the classification chain
  let node = classification;
  while (node) {
    const rank = (node.rank || "").toLowerCase();
    if (targetRanks[rank]) {
      result[targetRanks[rank]] = node.scientificname || null;
    }
    node = node.child || null;
  }

  return result;
}

/**
 * Extract functional groups from WoRMS attributes.
 */
function extractFunctionalGroups(attributes) {
  if (!Array.isArray(attributes)) return [];

  const groups = [];
  for (const attr of attributes) {
    const catId = attr.measurementTypeID || attr.category_id;
    // Functional group / biology attributes
    // measurementType contains "Functional group" or "Biology"
    const mType = (attr.measurementType || "").toLowerCase();
    const val = attr.measurementValue || attr.children?.[0]?.measurementValue;
    if (val && (mType.includes("functional group") || mType.includes("biology"))) {
      if (!groups.includes(val)) groups.push(val);
    }
  }
  return groups;
}

// ── Neo4j Cache ───────────────────────────────────────────────────────────

async function getCachedResult(normalizedName) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (wc:WormsCache {key: $key}) RETURN wc`,
      { key: normalizedName }
    );
    if (result.records.length === 0) return null;

    const props = result.records[0].get("wc").properties;
    const cachedAt = typeof props.cachedAt === "object" && props.cachedAt.toNumber
      ? props.cachedAt.toNumber()
      : Number(props.cachedAt);
    const data = JSON.parse(props.data);
    const age = Date.now() - cachedAt;

    return {
      data,
      fresh: age < CACHE_MS,
      cachedAt,
    };
  } finally {
    await session.close();
  }
}

async function setCachedResult(normalizedName, data) {
  const session = getSession();
  try {
    await session.run(
      `MERGE (wc:WormsCache {key: $key})
       SET wc.data = $data, wc.cachedAt = $cachedAt`,
      {
        key: normalizedName,
        data: JSON.stringify(data),
        cachedAt: Date.now(),
      }
    );
  } finally {
    await session.close();
  }
}

// ── WoRMS API Calls ───────────────────────────────────────────────────────

/**
 * Search WoRMS by scientific name.
 * Returns the best match AphiaRecord, preferring accepted exact matches.
 */
async function searchByName(scientificName) {
  const encoded = encodeURIComponent(scientificName);
  const url = `${BASE_URL}/AphiaRecordsByName/${encoded}?like=false&marine_only=false`;

  const res = await fetchWithTimeout(url, TIMEOUT_MS);
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`WoRMS name search failed: ${res.status}`);

  const records = await res.json();
  if (!Array.isArray(records) || records.length === 0) return null;

  const nameLower = scientificName.toLowerCase();

  // Case-insensitive exact matches
  const exactMatches = records.filter(
    (r) => (r.scientificname || "").toLowerCase() === nameLower
  );
  const pool = exactMatches.length > 0 ? exactMatches : records;

  // Prefer accepted
  const accepted = pool.find(
    (r) => (r.status || "").toLowerCase() === "accepted"
  );
  return accepted || pool[0];
}

/**
 * Fetch classification tree by AphiaID.
 */
async function getClassification(aphiaId) {
  const url = `${BASE_URL}/AphiaClassificationByAphiaID/${aphiaId}`;
  const res = await fetchWithTimeout(url, TIMEOUT_MS);
  if (!res.ok) throw new Error(`WoRMS classification failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch attributes by AphiaID.
 */
async function getAttributes(aphiaId) {
  const url = `${BASE_URL}/AphiaAttributesByAphiaID/${aphiaId}?include_inherited=true`;
  const res = await fetchWithTimeout(url, TIMEOUT_MS);
  if (!res.ok) throw new Error(`WoRMS attributes failed: ${res.status}`);
  return res.json();
}

// ── Main Lookup ───────────────────────────────────────────────────────────

/**
 * Look up a taxon in WoRMS. Returns a structured result with:
 * - taxonomy: classification hierarchy
 * - wormsEnvironment: boolean environment flags
 * - availability: { worms: 'live'|'stale_cache'|'unavailable' }
 * - warnings: string[]
 *
 * NEVER throws. All errors are captured in the result.
 */
async function lookupTaxon(scientificName) {
  const normalizedName = scientificName.toLowerCase().trim();

  // Check if there's already an in-flight request for this name
  if (inflightMap.has(normalizedName)) {
    return inflightMap.get(normalizedName);
  }

  const promise = _doLookup(scientificName, normalizedName);
  inflightMap.set(normalizedName, promise);

  try {
    return await promise;
  } finally {
    inflightMap.delete(normalizedName);
  }
}

async function _doLookup(scientificName, normalizedName) {
  // 1. Check cache
  const cached = await getCachedResult(normalizedName).catch(() => null);
  if (cached && cached.fresh) {
    return { ...cached.data, availability: { worms: "live" } };
  }

  // 2. Try live WoRMS
  try {
    const record = await searchByName(scientificName);

    if (!record) {
      // No WoRMS record found — not an error
      const result = {
        taxonomy: null,
        wormsEnvironment: null,
        availability: { worms: "not_found" },
        warnings: [],
      };
      // Cache "not found" to avoid repeated lookups
      await setCachedResult(normalizedName, result).catch(() => {});
      return result;
    }

    // Determine the effective AphiaID for classification/attributes
    const queriedAphiaId = record.AphiaID;
    const isAccepted = (record.status || "").toLowerCase() === "accepted";
    const effectiveAphiaId = (!isAccepted && record.valid_AphiaID)
      ? record.valid_AphiaID
      : queriedAphiaId;

    // Parallel fetch classification + attributes (independent)
    const [classResult, attrResult] = await Promise.allSettled([
      getClassification(effectiveAphiaId),
      getAttributes(effectiveAphiaId),
    ]);

    const classification = classResult.status === "fulfilled" ? classResult.value : null;
    const attributes = attrResult.status === "fulfilled" ? attrResult.value : null;

    const classData = extractClassification(classification);
    const functionalGroups = extractFunctionalGroups(attributes);

    const warnings = [];
    if (attrResult.status === "rejected") {
      warnings.push("WoRMS attribute data could not be retrieved; functional group info may be incomplete.");
    }

    const taxonomy = {
      order: classData.order,
      superfamily: classData.superfamily,
      family: classData.family,
      genus: classData.genus,
      rank: record.rank || null,
      status: (record.status || "").toLowerCase(),
      aphiaId: queriedAphiaId,
      acceptedName: !isAccepted ? (record.valid_name || null) : null,
      acceptedAphiaId: !isAccepted ? (record.valid_AphiaID || null) : null,
      source: "WoRMS",
      sourceUrl: record.url || (queriedAphiaId ? `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${queriedAphiaId}` : null),
    };

    const wormsEnvironment = {
      marine: normalizeBool(record.isMarine),
      brackishWater: normalizeBool(record.isBrackish),
      freshwater: normalizeBool(record.isFreshwater),
      terrestrial: normalizeBool(record.isTerrestrial),
      extinct: normalizeBool(record.isExtinct),
      functionalGroups,
    };

    const result = { taxonomy, wormsEnvironment, warnings };

    // Cache the result
    await setCachedResult(normalizedName, result).catch(() => {});

    return { ...result, availability: { worms: "live" } };
  } catch (err) {
    // WoRMS failed — try stale cache
    if (cached && cached.data) {
      return {
        ...cached.data,
        availability: { worms: "stale_cache" },
        warnings: [
          ...(cached.data.warnings || []),
          "WoRMS verisine şu anda ulaşılamadı; önbellek verisi gösteriliyor.",
        ],
      };
    }

    // No cache at all
    return {
      taxonomy: null,
      wormsEnvironment: null,
      availability: { worms: "unavailable" },
      warnings: ["WoRMS verisine şu anda ulaşılamadı; yerel ortam verileri gösteriliyor."],
    };
  }
}

// ── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  lookupTaxon,
  // Exported for testing
  normalizeBool,
  extractClassification,
  extractFunctionalGroups,
};
