/**
 * import_ontology.js
 * 
 * Foram Identification Ontology v1.0 — Neo4j Aura import
 * 
 * Reads the master JSON data (api/data/) and loads the complete ontology
 * graph directly into Neo4j Aura via the official driver.
 * 
 * Graph model (mirrors build_neo4j.py):
 *   (:Module {name})
 *   (:Genus {name, orderIndex?, flag?, taxonomicReviewRequired?, ...})
 *   (:Character {id, nameEn, nameTr, group, note?})
 *   (:Value {key, code, character, labelTr?})
 *   (:RuleItem {key, text, level, code?})
 *   (:Status {name})
 *   (:ObservationState {name, labelTr, note})
 *   (:Question {id, code, textEn, textTr, module, chrId?, ...})
 *   (:Outcome {id, kind})
 * 
 * Usage: node import_ontology.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const neo4j = require("neo4j-driver");

// ── Data paths ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}

// ── Neo4j connection ────────────────────────────────────────────────────
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// ── Helpers ─────────────────────────────────────────────────────────────
const LEVEL_NAMES = {
  M: "MANDATORY",
  D: "DIAGNOSTIC",
  S: "SUPPORTING",
  C: "CONTRADICTORY",
};

function normRule(item) {
  if (typeof item === "object" && item !== null && item.text !== undefined) {
    return { code: item.code || null, text: item.text };
  }
  return { code: null, text: item };
}

/** Run a batch of Cypher statements within a single session. */
async function runBatch(session, statements, label) {
  let done = 0;
  for (const stmt of statements) {
    await session.run(stmt.cypher, stmt.params || {});
    done++;
    if (done % 50 === 0 || done === statements.length) {
      process.stdout.write(`  ${label}: ${done}/${statements.length}\r`);
    }
  }
  console.log(`  ${label}: ${done}/${statements.length} — tamamlandi`);
}

// ── Load data ───────────────────────────────────────────────────────────
const chars = loadJSON("characters.json");
const allGenera = [
  ...loadJSON("genera_agglutinated.json").genera,
  ...loadJSON("genera_porcelaneous.json").genera,
  ...loadJSON("genera_hyaline.json").genera,
];
const trees = ["agglutinated", "porcelaneous", "hyaline"].map((m) =>
  loadJSON(`decision_tree_${m}.json`)
);
const ruleMap = loadJSON("rule_chr_mapping.json");

// ═══════════════════════════════════════════════════════════════════════
// STEP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

async function step0_clearDatabase(session) {
  console.log("\n[0] Veritabani temizleniyor...");
  await session.run("MATCH (n) DETACH DELETE n");
  console.log("  Veritabani temizlendi.");
}

async function step1_createConstraints(session) {
  console.log("\n[1] Constraint'ler olusturuluyor...");
  const constraints = [
    "CREATE CONSTRAINT genus_name IF NOT EXISTS FOR (g:Genus) REQUIRE g.name IS UNIQUE",
    "CREATE CONSTRAINT char_id IF NOT EXISTS FOR (c:Character) REQUIRE c.id IS UNIQUE",
    "CREATE CONSTRAINT value_key IF NOT EXISTS FOR (v:Value) REQUIRE v.key IS UNIQUE",
    "CREATE CONSTRAINT rule_key IF NOT EXISTS FOR (r:RuleItem) REQUIRE r.key IS UNIQUE",
    "CREATE CONSTRAINT module_name IF NOT EXISTS FOR (m:Module) REQUIRE m.name IS UNIQUE",
    "CREATE CONSTRAINT status_name IF NOT EXISTS FOR (s:Status) REQUIRE s.name IS UNIQUE",
    "CREATE CONSTRAINT obs_name IF NOT EXISTS FOR (o:ObservationState) REQUIRE o.name IS UNIQUE",
    "CREATE CONSTRAINT q_id IF NOT EXISTS FOR (q:Question) REQUIRE q.id IS UNIQUE",
    "CREATE CONSTRAINT outcome_id IF NOT EXISTS FOR (o:Outcome) REQUIRE o.id IS UNIQUE",
  ];
  for (const c of constraints) {
    await session.run(c);
  }
  console.log(`  ${constraints.length} constraint olusturuldu.`);
}

async function step2_createModules(session) {
  console.log("\n[2] Moduller olusturuluyor...");
  for (const m of ["AGGLUTINATED", "PORCELANEOUS", "HYALINE"]) {
    await session.run("MERGE (:Module {name: $name})", { name: m });
  }
  console.log("  3 modul olusturuldu.");
}

async function step3_createStatuses(session) {
  console.log("\n[3] Tani statusleri olusturuluyor...");
  for (const s of chars.identification_statuses) {
    await session.run("MERGE (:Status {name: $name})", { name: s });
  }
  console.log(`  ${chars.identification_statuses.length} status olusturuldu.`);
}

async function step4_createObservationStates(session) {
  console.log("\n[4] Gozlem durumlari olusturuluyor...");
  const states = chars.meta.global_response_states;
  for (const [name, info] of Object.entries(states)) {
    await session.run(
      `MERGE (o:ObservationState {name: $name})
       SET o.labelTr = $labelTr, o.note = $note`,
      { name, labelTr: info.tr, note: info.note }
    );
  }
  console.log(`  ${Object.keys(states).length} gozlem durumu olusturuldu.`);
}

async function step5_createCharactersAndValues(session) {
  console.log("\n[5] Karakterler ve kontrollu sozluk yukleniyor...");
  const stmts = [];

  for (const c of chars.characters) {
    // Character node
    stmts.push({
      cypher: `MERGE (c:Character {id: $id})
               SET c.nameEn = $nameEn, c.nameTr = $nameTr, c.group = $group
               ${c.note ? ", c.note = $note" : ""}`,
      params: {
        id: c.id,
        nameEn: c.name_en,
        nameTr: c.name_tr,
        group: c.group,
        ...(c.note ? { note: c.note } : {}),
      },
    });

    // Values
    const labelsTr = c.value_labels_tr || {};
    for (const v of c.values) {
      const key = `${c.id}_${v}`;
      const tr = labelsTr[v] || null;
      stmts.push({
        cypher: `MERGE (v:Value {key: $key})
                 SET v.code = $code, v.character = $charId
                 ${tr ? ", v.labelTr = $labelTr" : ""}`,
        params: {
          key,
          code: v,
          charId: c.id,
          ...(tr ? { labelTr: tr } : {}),
        },
      });

      // ALLOWS relationship
      stmts.push({
        cypher: `MATCH (c:Character {id: $charId}), (v:Value {key: $key})
                 MERGE (c)-[:ALLOWS]->(v)`,
        params: { charId: c.id, key },
      });
    }
  }

  await runBatch(session, stmts, "Karakterler+Degerler");
}

async function step6_createGenera(session) {
  console.log("\n[6] Cinsler yukleniyor...");
  const stmts = [];

  for (const g of allGenera) {
    // Genus node
    const setProps = [];
    const params = { name: g.genus, module: g.module };

    if (g.order) {
      setProps.push("g.orderIndex = $orderIndex");
      params.orderIndex = neo4j.int(g.order);
    }
    if (g.flag) {
      setProps.push("g.flag = $flag");
      params.flag = g.flag;
    }
    if (
      g.system_flags &&
      g.system_flags.some((f) => f.includes("taxonomicReviewRequired = TRUE"))
    ) {
      setProps.push("g.taxonomicReviewRequired = true");
    }
    if (g.best_differentiating_observation) {
      setProps.push(
        "g.bestDifferentiatingObservation = $bestDiffObs"
      );
      params.bestDiffObs = g.best_differentiating_observation;
    }
    if (g.section_note) {
      setProps.push("g.sectionNote = $sectionNote");
      params.sectionNote = g.section_note;
    }
    if (g.notes && g.notes.length > 0) {
      setProps.push("g.notes = $notes");
      params.notes = g.notes;
    }

    if (setProps.length === 0) {
      setProps.push("g.name = g.name"); // no-op SET to keep MERGE valid
    }

    stmts.push({
      cypher: `MERGE (g:Genus {name: $name}) SET ${setProps.join(", ")}`,
      params,
    });

    // BELONGS_TO module
    stmts.push({
      cypher: `MATCH (g:Genus {name: $name}), (m:Module {name: $module})
               MERGE (g)-[:BELONGS_TO]->(m)`,
      params: { name: g.genus, module: g.module },
    });
  }

  await runBatch(session, stmts, "Cinsler");
}

async function step7_createRules(session) {
  console.log("\n[7] Kural kartlari yukleniyor...");
  const stmts = [];

  for (const g of allGenera) {
    for (const [role, items] of Object.entries(g.rules)) {
      const levelName = LEVEL_NAMES[role];
      items.forEach((item, idx) => {
        const { code, text } = normRule(item);
        const key = `${g.genus}_${role}${idx + 1}`;

        // RuleItem node
        stmts.push({
          cypher: `MERGE (r:RuleItem {key: $key})
                   SET r.text = $text, r.level = $level
                   ${code ? ", r.code = $code" : ""}`,
          params: {
            key,
            text,
            level: levelName,
            ...(code ? { code } : {}),
          },
        });

        // HAS_RULE relationship
        stmts.push({
          cypher: `MATCH (g:Genus {name: $genus}), (r:RuleItem {key: $key})
                   MERGE (g)-[:HAS_RULE {level: $level}]->(r)`,
          params: { genus: g.genus, key, level: levelName },
        });
      });
    }
  }

  await runBatch(session, stmts, "Kurallar");
}

async function step8_createComparisons(session) {
  console.log("\n[8] Karsilastirma iliskileri yukleniyor...");
  const stmts = [];

  for (const g of allGenera) {
    for (const other of g.closest_comparisons || []) {
      stmts.push({
        cypher: `MATCH (a:Genus {name: $from}), (b:Genus {name: $to})
                 MERGE (a)-[:CLOSEST_COMPARISON]->(b)`,
        params: { from: g.genus, to: other },
      });
    }
  }

  await runBatch(session, stmts, "Karsilastirmalar");
}

async function step9_createDecisionTrees(session) {
  console.log("\n[9] Karar agaclari yukleniyor...");
  const stmts = [];

  for (const tree of trees) {
    // Question nodes
    for (const node of tree.nodes) {
      const params = {
        id: node.id,
        code: node.code,
        textEn: node.text_en,
        textTr: node.text_tr,
        module: tree.module,
      };

      let extraSet = "";
      if (node.chr_id) {
        extraSet += ", q.chrId = $chrId";
        params.chrId = node.chr_id;
      }
      if (node.observation_hint) {
        extraSet += ", q.observationHint = $obsHint";
        params.obsHint = node.observation_hint;
      }
      if (node.section_sensitive) {
        extraSet += ", q.sectionSensitive = true";
      }

      stmts.push({
        cypher: `MERGE (q:Question {id: $id})
                 SET q.code = $code, q.textEn = $textEn,
                     q.textTr = $textTr, q.module = $module${extraSet}`,
        params,
      });

      // ASKS_ABOUT -> Character
      if (node.chr_id) {
        stmts.push({
          cypher: `MATCH (q:Question {id: $qId}), (c:Character {id: $chrId})
                   MERGE (q)-[:ASKS_ABOUT]->(c)`,
          params: { qId: node.id, chrId: node.chr_id },
        });
      }
    }

    // TREE_ENTRY from Module
    stmts.push({
      cypher: `MATCH (m:Module {name: $module}), (q:Question {id: $entry})
               MERGE (m)-[:TREE_ENTRY]->(q)`,
      params: { module: tree.module, entry: tree.entry },
    });

    // ANSWER edges
    for (const node of tree.nodes) {
      for (const a of node.answers) {
        const value = a.value;
        const labelEn = a.label_en || a.value;
        const labelTr = a.label_tr || "";
        const nxt = a.next;

        const relProps = { value: "$value", labelEn: "$labelEn" };
        const params = { qId: node.id, value, labelEn };

        if (labelTr) {
          relProps.labelTr = "$labelTr";
          params.labelTr = labelTr;
        }

        // Build relationship property string
        let relPropStr = `value: $value, labelEn: $labelEn`;
        if (labelTr) {
          relPropStr += `, labelTr: $labelTr`;
        }

        if (nxt.startsWith("GENUS:")) {
          const genusName = nxt.split(":")[1];
          params.genus = genusName;
          stmts.push({
            cypher: `MATCH (q:Question {id: $qId}), (g:Genus {name: $genus})
                     MERGE (q)-[:ANSWER {${relPropStr}}]->(g)`,
            params,
          });
        } else if (
          nxt.startsWith("INDETERMINATE:") ||
          nxt.startsWith("REDIRECT:")
        ) {
          const outcomeId = nxt.replace(":", "_");
          const kind = nxt.split(":")[0];
          params.outcomeId = outcomeId;
          params.kind = kind;

          stmts.push({
            cypher: `MERGE (o:Outcome {id: $outcomeId}) SET o.kind = $kind`,
            params: { outcomeId, kind },
          });
          stmts.push({
            cypher: `MATCH (q:Question {id: $qId}), (o:Outcome {id: $outcomeId})
                     MERGE (q)-[:ANSWER {${relPropStr}}]->(o)`,
            params,
          });
        } else {
          // next is another Question
          params.nextQ = nxt;
          stmts.push({
            cypher: `MATCH (a:Question {id: $qId}), (b:Question {id: $nextQ})
                     MERGE (a)-[:ANSWER {${relPropStr}}]->(b)`,
            params,
          });
        }
      }
    }
  }

  await runBatch(session, stmts, "KararAgaci");
}

async function step10_createRuleMappings(session) {
  console.log("\n[10] Kural-karakter eslemeleri yukleniyor...");
  const stmts = [];

  for (const entry of ruleMap) {
    for (const h of entry.mappings) {
      let relPropStr = `confidence: $confidence`;
      const params = {
        ruleKey: entry.rule_key,
        chrId: h.chr_id,
        confidence: h.confidence,
      };

      if (h.value) {
        relPropStr += `, suggestedValue: $suggestedValue`;
        params.suggestedValue = h.value;
      }

      stmts.push({
        cypher: `MATCH (r:RuleItem {key: $ruleKey}), (c:Character {id: $chrId})
                 MERGE (r)-[:REFERS_TO {${relPropStr}}]->(c)`,
        params,
      });
    }
  }

  await runBatch(session, stmts, "KuralEslemeleri");
}

// ── Verification ────────────────────────────────────────────────────────
async function verify(session) {
  console.log("\n[✓] DOGRULAMA SORGULARI");
  console.log("─".repeat(50));

  const counts = [
    { label: "Module", cypher: "MATCH (n:Module) RETURN count(n) AS c" },
    { label: "Genus", cypher: "MATCH (n:Genus) RETURN count(n) AS c" },
    { label: "Character", cypher: "MATCH (n:Character) RETURN count(n) AS c" },
    { label: "Value", cypher: "MATCH (n:Value) RETURN count(n) AS c" },
    { label: "RuleItem", cypher: "MATCH (n:RuleItem) RETURN count(n) AS c" },
    { label: "Status", cypher: "MATCH (n:Status) RETURN count(n) AS c" },
    {
      label: "ObservationState",
      cypher: "MATCH (n:ObservationState) RETURN count(n) AS c",
    },
    { label: "Question", cypher: "MATCH (n:Question) RETURN count(n) AS c" },
    { label: "Outcome", cypher: "MATCH (n:Outcome) RETURN count(n) AS c" },
  ];

  const expected = {
    Module: 3,
    Genus: 75,
    Character: 21,
    Status: 5,
    ObservationState: 4,
    Question: 78,
  };

  let allOk = true;
  for (const { label, cypher } of counts) {
    const result = await session.run(cypher);
    const count = result.records[0].get("c").toNumber();
    const exp = expected[label];
    const status =
      exp !== undefined ? (count === exp ? "✓" : `✗ (beklenen: ${exp})`) : "—";
    if (exp !== undefined && count !== exp) allOk = false;
    console.log(`  ${label.padEnd(20)} ${String(count).padStart(5)}  ${status}`);
  }

  // Relationship counts
  const rels = [
    {
      label: "BELONGS_TO",
      cypher: "MATCH ()-[r:BELONGS_TO]->() RETURN count(r) AS c",
    },
    {
      label: "HAS_RULE",
      cypher: "MATCH ()-[r:HAS_RULE]->() RETURN count(r) AS c",
    },
    {
      label: "ALLOWS",
      cypher: "MATCH ()-[r:ALLOWS]->() RETURN count(r) AS c",
    },
    {
      label: "CLOSEST_COMPARISON",
      cypher: "MATCH ()-[r:CLOSEST_COMPARISON]->() RETURN count(r) AS c",
    },
    {
      label: "ANSWER",
      cypher: "MATCH ()-[r:ANSWER]->() RETURN count(r) AS c",
    },
    {
      label: "ASKS_ABOUT",
      cypher: "MATCH ()-[r:ASKS_ABOUT]->() RETURN count(r) AS c",
    },
    {
      label: "TREE_ENTRY",
      cypher: "MATCH ()-[r:TREE_ENTRY]->() RETURN count(r) AS c",
    },
    {
      label: "REFERS_TO",
      cypher: "MATCH ()-[r:REFERS_TO]->() RETURN count(r) AS c",
    },
  ];

  console.log("");
  for (const { label, cypher } of rels) {
    const result = await session.run(cypher);
    const count = result.records[0].get("c").toNumber();
    console.log(`  ${label.padEnd(20)} ${String(count).padStart(5)} iliski`);
  }

  // Module-level genus check
  console.log("\n  Modul bazinda cins sayilari:");
  const modResult = await session.run(
    `MATCH (g:Genus)-[:BELONGS_TO]->(m:Module)
     RETURN m.name AS module, count(g) AS c ORDER BY m.name`
  );
  for (const rec of modResult.records) {
    const mod = rec.get("module");
    const count = rec.get("c").toNumber();
    const status = count === 25 ? "✓" : `✗ (beklenen: 25)`;
    if (count !== 25) allOk = false;
    console.log(`    ${mod.padEnd(16)} ${count}  ${status}`);
  }

  // Tree entry check
  console.log("\n  Karar agaci giris noktalari:");
  const treeResult = await session.run(
    `MATCH (m:Module)-[:TREE_ENTRY]->(q:Question)
     RETURN m.name AS module, q.id AS entry`
  );
  for (const rec of treeResult.records) {
    console.log(`    ${rec.get("module").padEnd(16)} -> ${rec.get("entry")}`);
  }

  // Sample path: Spiroplectammina
  console.log("\n  Ornek yol (Spiroplectammina):");
  const pathResult = await session.run(
    `MATCH p=(m:Module {name:'AGGLUTINATED'})-[:TREE_ENTRY]->()-[:ANSWER*]->(g:Genus {name:'Spiroplectammina'})
     RETURN length(p) AS depth LIMIT 1`
  );
  if (pathResult.records.length > 0) {
    console.log(
      `    ✓ AGGLUTINATED -> ... -> Spiroplectammina (derinlik: ${pathResult.records[0].get("depth")})`
    );
  } else {
    console.log("    ✗ Spiroplectammina yolu bulunamadi!");
    allOk = false;
  }

  console.log("\n" + "═".repeat(50));
  console.log(allOk ? "  TUM DOGRULAMALAR BASARILI ✓" : "  BAZI DOGRULAMALAR BASARISIZ ✗");
  console.log("═".repeat(50));
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═".repeat(60));
  console.log("  FORAM ONTOLOGY v1.0 — NEO4J AURA IMPORT");
  console.log("  URI: " + process.env.NEO4J_URI);
  console.log("═".repeat(60));

  const session = driver.session();
  const startTime = Date.now();

  try {
    await step0_clearDatabase(session);
    await step1_createConstraints(session);
    await step2_createModules(session);
    await step3_createStatuses(session);
    await step4_createObservationStates(session);
    await step5_createCharactersAndValues(session);
    await step6_createGenera(session);
    await step7_createRules(session);
    await step8_createComparisons(session);
    await step9_createDecisionTrees(session);
    await step10_createRuleMappings(session);

    await verify(session);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nToplam sure: ${elapsed}s`);
  } catch (error) {
    console.error("\n✗ HATA:", error.message);
    if (error.code) console.error("  Neo4j kodu:", error.code);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
