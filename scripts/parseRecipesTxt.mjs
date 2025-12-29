/**
 * Простой парсер твоего файла "рецепты.txt" (TSV из Excel).
 * Делает JSON, который потом можно загрузить в Firebase (или импортировать вручную).
 *
 * Usage:
 *   node ./scripts/parseRecipesTxt.mjs ./путь/к/рецепты.txt > recipes.json
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Укажи путь к рецепты.txt");
  process.exit(1);
}

const input = fs.readFileSync(file, "utf8");

// CSV/TSV парсинг с поддержкой переводов строки внутри кавычек
function parseTSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === "\t") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

const rows = parseTSV(input);

// Помощники
const isEmptyRow = (r) => !r || r.every((c) => !String(c ?? "").trim());
const isNameRow = (r) => r?.[0]?.trim() && r.slice(1).every((c) => !String(c ?? "").trim());
const safeNum = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const normalize = (s) => String(s ?? "").trim();

// Парс рецептов
const recipes = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (isEmptyRow(r)) continue;
  if (!isNameRow(r)) continue;

  const name = normalize(r[0]);
  // header
  i++;
  while (i < rows.length && isEmptyRow(rows[i])) i++;
  const header = rows[i] ?? [];
  i++;

  const ingredients = [];
  for (; i < rows.length; i++) {
    const rr = rows[i];
    if (isEmptyRow(rr)) break;
    if (isNameRow(rr)) {
      i--; // откатим, чтобы внешний цикл обработал следующий рецепт
      break;
    }
    const flag = normalize(rr[0]);
    const ingName = normalize(rr[1]);
    if (!ingName) continue;

    // В твоём файле первый столбец ИСТИНА/ЛОЖЬ — трактуем как "опционально" (гарнир)
    const optional = flag === "ЛОЖЬ";

    ingredients.push({
      name: ingName,
      qty: safeNum(rr[2]),
      unit: "l", // дальше можно уточнить при импорте/в редакторе
      optional,
      meta: {
        flag,
        col_qty: rr[2],
        col_count: rr[3],
        col_total: rr[4],
        glass: rr[5],
        method: rr[6],
        header,
      },
    });
  }

  recipes.push({
    name,
    glass: normalize(ingredients.find((x) => x.meta.glass)?.meta.glass ?? ""),
    method: normalize(ingredients.find((x) => x.meta.method)?.meta.method ?? ""),
    ingredients,
  });
}

process.stdout.write(JSON.stringify({ recipes }, null, 2));
