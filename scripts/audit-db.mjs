import initSqlJs from "sql.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve("public/data/words.sqlite");

if (!existsSync(DB_PATH)) {
  console.error(`Missing ${DB_PATH}. Run npm run preprocess first.`);
  process.exitCode = 1;
} else {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(DB_PATH));

  section("Database Summary");
  printRows(
    db,
    `
      SELECT
        COUNT(*) AS records,
        SUM(commonness = 'common') AS common,
        SUM(commonness = 'rare') AS rare,
        SUM(alternate_pos != '') AS alternate_pos_entries,
        SUM(acronym_hint) AS acronym_hints,
        SUM(proper_noun_hint) AS proper_noun_hints,
        SUM(offensive_hint) AS offensive_hints
      FROM words
    `,
  );

  section("Part-of-Speech Distribution");
  printRows(
    db,
    `
      SELECT pos, COUNT(*) AS records, ROUND(AVG(quality_score), 1) AS avg_quality
      FROM words
      GROUP BY pos
      ORDER BY records DESC
    `,
  );

  section("POS Inference Sources");
  printRows(
    db,
    `
      SELECT
        pos_source,
        COUNT(*) AS records,
        ROUND(AVG(pos_confidence), 1) AS avg_confidence,
        ROUND(AVG(quality_score), 1) AS avg_quality
      FROM words
      GROUP BY pos_source
      ORDER BY records DESC
    `,
  );

  section("Alternate POS Entries");
  printRows(
    db,
    `
      SELECT word, pos, alternate_pos, pos_source, frequency_band, quality_score
      FROM words
      WHERE alternate_pos != ''
      ORDER BY frequency_band, word
      LIMIT 120
    `,
  );

  section("Default Pool Shape");
  printRows(
    db,
    `
      SELECT pos, COUNT(*) AS records, ROUND(AVG(quality_score), 1) AS avg_quality
      FROM words
      WHERE
        commonness = 'common'
        AND is_phrase = 0
        AND has_apostrophe = 0
        AND has_hyphen = 0
        AND proper_noun_hint = 0
        AND offensive_hint = 0
        AND acronym_hint = 0
        AND dialect_us = 1
        AND length BETWEEN 2 AND 12
      GROUP BY pos
      ORDER BY records DESC
    `,
  );

  section("High-Quality Short Words To Review");
  printRows(
    db,
    `
      SELECT word, pos, length, commonness, frequency_band, quality_score
      FROM words
      WHERE length <= 3 AND quality_score >= 70 AND acronym_hint = 0
      ORDER BY quality_score DESC, word
      LIMIT 80
    `,
  );

  section("Acronym-Like Entries Not Flagged");
  printRows(
    db,
    `
      SELECT word, pos, length, commonness, frequency_band, quality_score
      FROM words
      WHERE
        acronym_hint = 0
        AND word IN (
          'adj', 'adv', 'afr', 'atm', 'bbl', 'bpm', 'bps', 'cds', 'chg', 'chm', 'cir',
          'css', 'dns', 'ems', 'eta', 'ftp', 'gdp', 'gui', 'ip', 'isp', 'rna', 'sos',
          'sql', 'uri'
        )
      ORDER BY quality_score DESC, word
      LIMIT 120
    `,
  );

  section("Likely Proper Nouns Not Flagged");
  printRows(
    db,
    `
      SELECT word, pos, length, commonness, frequency_band, quality_score
      FROM words
      WHERE
        proper_noun_hint = 0
        AND word IN (
          'africa', 'alaska', 'america', 'american', 'asia', 'asian', 'australia', 'australian',
          'brazil', 'britain', 'british', 'california', 'canada', 'canadian', 'china', 'chinese',
          'christian', 'europe', 'european', 'france', 'french', 'germany', 'german', 'india',
          'indian', 'ireland', 'irish', 'italian', 'italy', 'japan', 'japanese', 'korea', 'korean',
          'london', 'mexican', 'mexico', 'roman', 'spain'
        )
      ORDER BY word
    `,
  );

  section("Potential POS Overrides");
  printPosMismatches(
    db,
    new Map([
      ["about", "preposition"],
      ["above", "preposition"],
      ["across", "preposition"],
      ["after", "preposition"],
      ["against", "preposition"],
      ["along", "preposition"],
      ["although", "conjunction"],
      ["am", "verb"],
      ["among", "preposition"],
      ["are", "verb"],
      ["around", "preposition"],
      ["be", "verb"],
      ["because", "conjunction"],
      ["been", "verb"],
      ["before", "preposition"],
      ["behind", "preposition"],
      ["being", "verb"],
      ["below", "preposition"],
      ["beneath", "preposition"],
      ["beside", "preposition"],
      ["between", "preposition"],
      ["beyond", "preposition"],
      ["can", "verb"],
      ["could", "verb"],
      ["did", "verb"],
      ["does", "verb"],
      ["during", "preposition"],
      ["had", "verb"],
      ["has", "verb"],
      ["inside", "preposition"],
      ["is", "verb"],
      ["may", "verb"],
      ["might", "verb"],
      ["must", "verb"],
      ["near", "preposition"],
      ["outside", "preposition"],
      ["shall", "verb"],
      ["should", "verb"],
      ["through", "preposition"],
      ["toward", "preposition"],
      ["under", "preposition"],
      ["unless", "conjunction"],
      ["until", "conjunction"],
      ["was", "verb"],
      ["were", "verb"],
      ["whereas", "conjunction"],
      ["whether", "conjunction"],
      ["while", "conjunction"],
      ["will", "verb"],
      ["within", "preposition"],
      ["without", "preposition"],
      ["would", "verb"],
    ]),
  );

  section("Ambiguous POS Review Candidates");
  printRows(
    db,
    `
      SELECT word, pos, base_form, pos_source, pos_confidence, frequency_band, quality_score
      FROM words
      WHERE
        commonness = 'common'
        AND is_phrase = 0
        AND (
          pos_source = 'morphology'
          OR word IN ('painting', 'boring', 'interesting', 'tired', 'excited', 'light', 'set', 'run')
        )
      ORDER BY
        CASE WHEN word IN ('painting', 'boring', 'interesting', 'tired', 'excited', 'light', 'set', 'run') THEN 0 ELSE 1 END,
        pos_source,
        quality_score DESC,
        word
      LIMIT 120
    `,
  );
}

function section(title) {
  console.log(`\n## ${title}`);
}

function printRows(db, sql) {
  const result = db.exec(sql);
  if (!result[0]) {
    console.log("(no rows)");
    return;
  }

  const { columns, values } = result[0];
  console.log(columns.join("\t"));
  for (const row of values) {
    console.log(row.join("\t"));
  }
}

function printPosMismatches(db, expectedPos) {
  const placeholders = [...expectedPos.keys()].map(() => "?").join(", ");
  const result = db.exec(
    `
      SELECT word, pos, frequency_band, quality_score
      FROM words
      WHERE word IN (${placeholders})
      ORDER BY word
    `,
    [...expectedPos.keys()],
  );

  const rows =
    result[0]?.values
      .map(([word, pos, frequencyBand, qualityScore]) => ({
        word: String(word),
        expected: expectedPos.get(String(word)),
        actual: String(pos),
        frequencyBand,
        qualityScore,
      }))
      .filter((row) => row.expected !== row.actual) ?? [];

  if (!rows.length) {
    console.log("(no rows)");
    return;
  }

  console.log("word\texpected\tactual\tfrequency_band\tquality_score");
  for (const row of rows) {
    console.log(`${row.word}\t${row.expected}\t${row.actual}\t${row.frequencyBand}\t${row.qualityScore}`);
  }
}
