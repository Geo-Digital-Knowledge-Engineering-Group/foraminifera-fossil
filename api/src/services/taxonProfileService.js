/**
 * taxonProfileService.js
 *
 * Queries TaxonProfile nodes from Neo4j for local paleo-environment data.
 * Also checks whether a genus exists in the 75-genus diagnosis ontology.
 */

const { getSession } = require("../db/neo4j");

/**
 * Get local TaxonProfile records for a given genus name.
 * Returns species-level profiles linked to the genus AND the genus-level profile if it exists.
 * Also checks if the genus is in the diagnosis ontology.
 */
async function getProfilesByGenusName(genusName) {
  const session = getSession();
  try {
    const normalizedName = genusName.toLowerCase().trim();

    // 1. Check if this genus exists in the diagnosis ontology (75 genera)
    const genusResult = await session.run(
      `MATCH (g:Genus) WHERE toLower(g.name) = $name RETURN g.name AS name LIMIT 1`,
      { name: normalizedName }
    );
    const genusExistsInOntology = genusResult.records.length > 0;

    // 2. Find all TaxonProfile records where parentGenus matches (case-insensitive)
    const profileResult = await session.run(
      `MATCH (tp:TaxonProfile)
       WHERE toLower(tp.parentGenus) = $name
       RETURN tp
       ORDER BY tp.rank DESC, tp.scientificName`,
      { name: normalizedName }
    );

    const profiles = profileResult.records.map((rec) => {
      const props = rec.get("tp").properties;
      return {
        scientificName: props.scientificName,
        rank: props.rank,
        parentGenus: props.parentGenus,
        depthTextTr: props.depthTextTr || null,
        habitatTextTr: props.habitatTextTr || null,
        sourceLabel: props.sourceLabel || null,
        taxonomicReviewRequired: props.taxonomicReviewRequired || false,
      };
    });

    return {
      profiles,
      genusExistsInOntology,
    };
  } finally {
    await session.close();
  }
}

/**
 * Search all TaxonProfile records with optional text and rank filters.
 * Returns each record with its ontology link status.
 */
async function searchProfiles(searchTerm, rankFilter) {
  const session = getSession();
  try {
    let cypher = `MATCH (tp:TaxonProfile)`;
    const params = {};
    const conditions = [];

    if (searchTerm) {
      conditions.push(`toLower(tp.scientificName) CONTAINS $search`);
      params.search = searchTerm.toLowerCase().trim();
    }

    if (rankFilter && (rankFilter === "SPECIES" || rankFilter === "GENUS")) {
      conditions.push(`tp.rank = $rank`);
      params.rank = rankFilter;
    }

    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(" AND ")}`;
    }

    cypher += ` RETURN tp ORDER BY tp.rank DESC, tp.scientificName`;

    const result = await session.run(cypher, params);

    // Collect unique parent genera to check ontology membership
    const parentGenera = new Set();
    const profiles = result.records.map((rec) => {
      const props = rec.get("tp").properties;
      parentGenera.add(props.parentGenus);
      return {
        scientificName: props.scientificName,
        rank: props.rank,
        parentGenus: props.parentGenus,
        depthTextTr: props.depthTextTr || null,
        habitatTextTr: props.habitatTextTr || null,
        sourceLabel: props.sourceLabel || null,
        taxonomicReviewRequired: props.taxonomicReviewRequired || false,
      };
    });

    // Check which parent genera exist in the ontology
    const ontologyCheck = await session.run(
      `MATCH (g:Genus)
       WHERE toLower(g.name) IN $names
       RETURN toLower(g.name) AS name`,
      { names: Array.from(parentGenera).map((n) => n.toLowerCase()) }
    );
    const ontologyGenera = new Set(
      ontologyCheck.records.map((r) => r.get("name"))
    );

    // Annotate each profile
    const annotated = profiles.map((p) => ({
      ...p,
      linkedToOntology: ontologyGenera.has(p.parentGenus.toLowerCase()),
    }));

    return annotated;
  } finally {
    await session.close();
  }
}

module.exports = {
  getProfilesByGenusName,
  searchProfiles,
};
