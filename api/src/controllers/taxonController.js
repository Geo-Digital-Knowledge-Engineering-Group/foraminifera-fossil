/**
 * taxonController.js
 *
 * Endpoints for taxon taxonomy (WoRMS) and local paleo-environment profiles.
 * WoRMS failures never produce HTTP error responses — the API always returns
 * 200 with availability metadata so the frontend can show partial data.
 */

const { lookupTaxon } = require("../services/wormsService");
const { getProfilesByGenusName, searchProfiles } = require("../services/taxonProfileService");

/**
 * GET /api/taxa/profile?name=Alveolina
 *
 * Combines WoRMS taxonomy data with local TaxonProfile records.
 * Always returns HTTP 200 — WoRMS failures are indicated in availability.worms.
 */
exports.getProfile = async (req, res) => {
  const name = (req.query.name || "").trim();
  if (!name) {
    return res.status(400).json({ success: false, error: "name query parameter is required" });
  }

  const normalizedName = name.toLowerCase();

  try {
    // Fetch WoRMS data and local profiles in parallel
    const [wormsResult, localResult] = await Promise.all([
      lookupTaxon(name),
      getProfilesByGenusName(name),
    ]);

    const { taxonomy, wormsEnvironment, availability: wormsAvailability, warnings: wormsWarnings } = wormsResult;
    const { profiles, genusExistsInOntology } = localResult;

    // Add species-level generalization warnings
    const warnings = [...(wormsWarnings || [])];
    const localProfiles = profiles.map((p) => {
      const profile = { ...p };
      if (p.rank === "SPECIES" && p.parentGenus.toLowerCase() !== normalizedName) {
        // Species belonging to a different genus — shouldn't happen but guard
        return profile;
      }
      if (p.rank === "SPECIES") {
        profile.generalizationWarning =
          `Bu ortam kaydı ${p.scientificName} türüne aittir; ${p.parentGenus} cinsinin bütün türlerine otomatik olarak genellenemez.`;
      }
      return profile;
    });

    // Taxonomic review warnings
    for (const p of localProfiles) {
      if (p.taxonomicReviewRequired) {
        warnings.push(
          `${p.scientificName} için taksonomik inceleme gereklidir; adın WoRMS'taki karşılığı farklı olabilir.`
        );
      }
    }

    res.json({
      success: true,
      query: {
        scientificName: name,
        normalizedName,
      },
      taxonomy: taxonomy || null,
      wormsEnvironment: wormsEnvironment || null,
      localProfiles,
      availability: {
        worms: wormsAvailability.worms,
        local: localProfiles.length > 0,
      },
      warnings,
    });
  } catch (error) {
    console.error("getProfile error:", error);
    res.status(500).json({ success: false, error: "Takson profili sorgusu başarısız." });
  }
};

/**
 * GET /api/taxa/environment?search=alveolina&rank=SPECIES
 *
 * Returns filtered local TaxonProfile records with ontology link status.
 */
exports.getEnvironment = async (req, res) => {
  const search = (req.query.search || "").trim();
  const rank = (req.query.rank || "").trim().toUpperCase();

  try {
    const validRank = (rank === "SPECIES" || rank === "GENUS") ? rank : null;
    const profiles = await searchProfiles(search || null, validRank);

    res.json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("getEnvironment error:", error);
    res.status(500).json({ success: false, error: "Ortam verileri sorgusu başarısız." });
  }
};
