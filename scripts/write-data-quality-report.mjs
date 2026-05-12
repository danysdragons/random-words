import initSqlJs from "sql.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = resolve("public/data/words.sqlite");
const OUT_PATH = resolve("docs/data-quality-report.md");

if (!existsSync(DB_PATH)) {
  console.error(`Missing ${DB_PATH}. Run npm run preprocess first.`);
  process.exitCode = 1;
} else {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(DB_PATH));

  const sections = [
    "# Data Quality Report",
    "",
    "This report is generated from `public/data/words.sqlite` and highlights current POS confidence and review buckets.",
    "",
    "## Summary",
    "",
    markdownTable(
      rows(
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
      ),
    ),
    "",
    "## POS Inference Sources",
    "",
    markdownTable(
      rows(
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
      ),
    ),
    "",
    "## Alternate POS Entries",
    "",
    "Curated words that can match more than one POS filter.",
    "",
    markdownTable(
      rows(
        db,
        `
          SELECT word, pos, REPLACE(TRIM(alternate_pos, '|'), '|', ', ') AS alternate_pos, pos_source, frequency_band, quality_score
          FROM words
          WHERE alternate_pos != ''
          ORDER BY frequency_band, word
          LIMIT 120
        `,
      ),
    ),
    "",
    "## Core Default Noun Fallbacks",
    "",
    "High-priority words in the `core` band still using the default noun fallback.",
    "",
    markdownTable(reviewRows(db, "core", "default", 80)),
    "",
    "## Familiar Default Noun Fallbacks",
    "",
    "Familiar words still using the default noun fallback.",
    "",
    markdownTable(reviewRows(db, "familiar", "default", 80)),
    "",
    "## Core/Familiar Suffix-Inferred Words",
    "",
    "Common words still tagged by broad suffix rules. These are good candidates for curated overrides.",
    "",
    markdownTable(
      rows(
        db,
        `
          SELECT word, pos, pos_source, pos_confidence, frequency_band, quality_score
          FROM words
          WHERE
            commonness = 'common'
            AND pos_source = 'suffix'
            AND frequency_band IN ('core', 'familiar')
          ORDER BY frequency_band, word
          LIMIT 120
        `,
      ),
    ),
    "",
    "## Ambiguous POS Candidates",
    "",
    "Words that are useful but likely need multi-POS handling or periodic review.",
    "",
    markdownTable(
      rows(
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
          LIMIT 80
        `,
      ),
    ),
    "",
    "## Suggested Next Review",
    "",
    "- Review the remaining core default noun fallbacks first.",
    "- Review core/familiar suffix-inferred words second; suffix rules are intentionally broad.",
    "- Move genuinely ambiguous words to a future multi-POS schema instead of forcing one label.",
    "",
  ];

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${sections.join("\n")}\n`);
  db.close();
  console.log(`Wrote ${OUT_PATH}`);
}

function reviewRows(db, frequencyBand, posSource, limit) {
  return rows(
    db,
    `
      SELECT word, pos, pos_source, pos_confidence, frequency_band, quality_score
      FROM words
      WHERE frequency_band = ? AND pos_source = ?
      ORDER BY word
      LIMIT ?
    `,
    [frequencyBand, posSource, limit],
  );
}

function rows(db, sql, params = []) {
  const result = db.exec(sql, params);
  if (!result[0]) return { columns: [], values: [] };
  return result[0];
}

function markdownTable(result) {
  const { columns, values } = result;
  if (!columns.length || !values.length) return "_No rows._";
  const header = `| ${columns.join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = values.map((row) => `| ${row.map(markdownCell).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}
