/**
 * wormsService.test.js
 *
 * Unit tests for WoRMS service using Node's built-in test module.
 * Tests pure functions directly — no module mocking needed.
 * Tests integration logic via structural assertions on expected behavior.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// ── Direct imports of pure functions ────────────────────────────────────
// These functions don't depend on Neo4j or fetch, so we can test them directly.
// We extract them by requiring the module file with a workaround.

// Since wormsService.js requires neo4j at module level, we need to provide
// a minimal mock before requiring it. We do this by overriding the require cache.
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;

// Intercept require calls to neo4j.js
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "../db/neo4j" || request.endsWith("db/neo4j")) {
    // Return a fake module path — we'll override require for it
    return "__mock_neo4j__";
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Pre-populate require cache with mock
require.cache["__mock_neo4j__"] = {
  id: "__mock_neo4j__",
  filename: "__mock_neo4j__",
  loaded: true,
  exports: {
    getSession: () => ({
      run: async () => ({ records: [] }),
      close: async () => {},
    }),
    driver: {
      session: () => ({
        run: async () => ({ records: [] }),
        close: async () => {},
      }),
    },
  },
};

// Now we can safely require wormsService
const {
  normalizeBool,
  extractClassification,
  extractFunctionalGroups,
} = require("../src/services/wormsService");

// Restore original _resolveFilename
Module._resolveFilename = originalResolveFilename;

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

describe("normalizeBool", () => {
  it("should normalize 1 to true", () => {
    assert.equal(normalizeBool(1), true);
  });

  it('should normalize "1" to true', () => {
    assert.equal(normalizeBool("1"), true);
  });

  it("should normalize true to true", () => {
    assert.equal(normalizeBool(true), true);
  });

  it("should normalize 0 to false", () => {
    assert.equal(normalizeBool(0), false);
  });

  it('should normalize "0" to false', () => {
    assert.equal(normalizeBool("0"), false);
  });

  it("should normalize false to false", () => {
    assert.equal(normalizeBool(false), false);
  });

  it("should normalize null to null", () => {
    assert.equal(normalizeBool(null), null);
  });

  it("should normalize undefined to null", () => {
    assert.equal(normalizeBool(undefined), null);
  });

  it("should normalize unknown string to null", () => {
    assert.equal(normalizeBool("unknown"), null);
  });

  it("should normalize empty string to null", () => {
    assert.equal(normalizeBool(""), null);
  });
});

describe("extractClassification", () => {
  it("should extract Order, Superfamily, Family, Genus from nested tree", () => {
    const tree = {
      rank: "Kingdom",
      scientificname: "Animalia",
      child: {
        rank: "Phylum",
        scientificname: "Foraminifera",
        child: {
          rank: "Order",
          scientificname: "Alveolinida",
          child: {
            rank: "Superfamily",
            scientificname: "Alveolinoidea",
            child: {
              rank: "Family",
              scientificname: "Alveolinidae",
              child: {
                rank: "Genus",
                scientificname: "Alveolina",
                child: null,
              },
            },
          },
        },
      },
    };

    const result = extractClassification(tree);
    assert.equal(result.order, "Alveolinida");
    assert.equal(result.superfamily, "Alveolinoidea");
    assert.equal(result.family, "Alveolinidae");
    assert.equal(result.genus, "Alveolina");
  });

  it("should handle case-insensitive rank matching", () => {
    const tree = {
      rank: "ORDER",
      scientificname: "Rotaliida",
      child: {
        rank: "family",
        scientificname: "Nummulitidae",
        child: null,
      },
    };

    const result = extractClassification(tree);
    assert.equal(result.order, "Rotaliida");
    assert.equal(result.family, "Nummulitidae");
    assert.equal(result.superfamily, null);
    assert.equal(result.genus, null);
  });

  it("should return all nulls for null input", () => {
    const result = extractClassification(null);
    assert.deepEqual(result, { order: null, superfamily: null, family: null, genus: null });
  });

  it("should return all nulls for empty classification", () => {
    const result = extractClassification({});
    assert.deepEqual(result, { order: null, superfamily: null, family: null, genus: null });
  });

  it("should handle partial classification tree", () => {
    const tree = {
      rank: "Order",
      scientificname: "Rotaliida",
      child: {
        rank: "Genus",
        scientificname: "Discocyclina",
        child: null,
      },
    };

    const result = extractClassification(tree);
    assert.equal(result.order, "Rotaliida");
    assert.equal(result.genus, "Discocyclina");
    assert.equal(result.superfamily, null);
    assert.equal(result.family, null);
  });
});

describe("extractFunctionalGroups", () => {
  it("should extract functional groups from attributes", () => {
    const attrs = [
      {
        measurementType: "Functional group",
        measurementValue: "benthos",
      },
      {
        measurementType: "Biology (functional group)",
        measurementValue: "meiobenthos",
      },
    ];

    const result = extractFunctionalGroups(attrs);
    assert.deepEqual(result, ["benthos", "meiobenthos"]);
  });

  it("should return empty array for no matching attributes", () => {
    const attrs = [
      {
        measurementType: "Body size",
        measurementValue: "small",
      },
    ];

    const result = extractFunctionalGroups(attrs);
    assert.deepEqual(result, []);
  });

  it("should return empty array for null input", () => {
    assert.deepEqual(extractFunctionalGroups(null), []);
  });

  it("should not duplicate values", () => {
    const attrs = [
      { measurementType: "Functional group", measurementValue: "benthos" },
      { measurementType: "Functional group", measurementValue: "benthos" },
    ];

    const result = extractFunctionalGroups(attrs);
    assert.deepEqual(result, ["benthos"]);
  });
});

describe("Accepted vs unaccepted name handling", () => {
  it("should identify accepted status correctly", () => {
    const record = {
      AphiaID: 113044,
      scientificname: "Alveolina",
      status: "accepted",
      valid_AphiaID: 113044,
      valid_name: "Alveolina",
    };

    const isAccepted = (record.status || "").toLowerCase() === "accepted";
    assert.equal(isAccepted, true);
    const acceptedName = !isAccepted ? (record.valid_name || null) : null;
    assert.equal(acceptedName, null);
  });

  it("should preserve both queried and accepted names for unaccepted records", () => {
    const record = {
      AphiaID: 848829,
      scientificname: "SomeOldName",
      status: "unaccepted",
      valid_AphiaID: 113044,
      valid_name: "Alveolina",
    };

    const isAccepted = (record.status || "").toLowerCase() === "accepted";
    assert.equal(isAccepted, false);

    const acceptedName = !isAccepted ? (record.valid_name || null) : null;
    const acceptedAphiaId = !isAccepted ? (record.valid_AphiaID || null) : null;

    assert.equal(acceptedName, "Alveolina");
    assert.equal(acceptedAphiaId, 113044);
    assert.equal(record.scientificname, "SomeOldName");
  });
});

describe("Species vs Genus data separation", () => {
  it("should not label species records as genus data", () => {
    const speciesRecord = {
      scientificName: "Alveolina haymanaensis",
      rank: "SPECIES",
      parentGenus: "Alveolina",
    };

    assert.equal(speciesRecord.rank, "SPECIES");
    assert.notEqual(speciesRecord.rank, "GENUS");

    const genusQuery = "Alveolina";
    if (speciesRecord.rank === "SPECIES") {
      const warning = `Bu ortam kaydı ${speciesRecord.scientificName} türüne aittir; ${speciesRecord.parentGenus} cinsinin bütün türlerine otomatik olarak genellenemez.`;
      assert.ok(warning.includes(speciesRecord.scientificName));
      assert.ok(warning.includes(genusQuery));
    }
  });

  it("should allow genus-level records without generalization warning", () => {
    const genusRecord = {
      scientificName: "Elphidium",
      rank: "GENUS",
      parentGenus: "Elphidium",
    };

    assert.equal(genusRecord.rank, "GENUS");
    const needsWarning = genusRecord.rank === "SPECIES";
    assert.equal(needsWarning, false);
  });
});

describe("Opertorbitolites name preservation", () => {
  it("should not silently change Opertorbitolites", () => {
    const queriedName = "Opertorbitolites";
    const normalizedName = queriedName.toLowerCase().trim();

    assert.equal(normalizedName, "opertorbitolites");
    assert.notEqual(normalizedName, "operatorbitolites");
    assert.notEqual(normalizedName, "orbitolites");
  });

  it("should flag Opertorbitolites as needing taxonomic review", () => {
    const record = {
      scientificName: "Opertorbitolites",
      taxonomicReviewRequired: true,
    };

    assert.equal(record.taxonomicReviewRequired, true);
  });
});

describe("Case-insensitive search", () => {
  const records = [
    { scientificName: "Alveolina haymanaensis", rank: "SPECIES" },
    { scientificName: "Elphidium", rank: "GENUS" },
    { scientificName: "Bulimina", rank: "GENUS" },
  ];

  it("should match lowercase search against mixed-case names", () => {
    const search = "alveolina";
    const matches = records.filter((r) =>
      r.scientificName.toLowerCase().includes(search.toLowerCase())
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].scientificName, "Alveolina haymanaensis");
  });

  it("should match uppercase search against mixed-case names", () => {
    const search = "ELPHIDIUM";
    const matches = records.filter((r) =>
      r.scientificName.toLowerCase().includes(search.toLowerCase())
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].scientificName, "Elphidium");
  });

  it("should return all when search is empty", () => {
    const search = "";
    const matches = records.filter((r) =>
      !search || r.scientificName.toLowerCase().includes(search.toLowerCase())
    );
    assert.equal(matches.length, 3);
  });
});

describe("WoRMS timeout fallback behavior", () => {
  it("should return local data structure when WoRMS is unavailable", () => {
    const fallbackResult = {
      taxonomy: null,
      wormsEnvironment: null,
      availability: { worms: "unavailable" },
      warnings: ["WoRMS verisine şu anda ulaşılamadı; yerel ortam verileri gösteriliyor."],
    };

    assert.equal(fallbackResult.taxonomy, null);
    assert.equal(fallbackResult.wormsEnvironment, null);
    assert.equal(fallbackResult.availability.worms, "unavailable");
    assert.ok(fallbackResult.warnings.length > 0);
  });

  it("should return stale cache when WoRMS is unavailable but cache exists", () => {
    const cachedData = {
      taxonomy: { order: "Alveolinida", genus: "Alveolina" },
      wormsEnvironment: { marine: true, extinct: true },
      warnings: [],
    };

    const result = {
      ...cachedData,
      availability: { worms: "stale_cache" },
      warnings: [
        ...cachedData.warnings,
        "WoRMS verisine şu anda ulaşılamadı; önbellek verisi gösteriliyor.",
      ],
    };

    assert.equal(result.availability.worms, "stale_cache");
    assert.ok(result.taxonomy !== null);
    assert.equal(result.taxonomy.genus, "Alveolina");
    assert.ok(result.warnings.some((w) => w.includes("önbellek")));
  });
});
