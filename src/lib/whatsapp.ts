import { CatalogItem, CATALOG_SECTIONS, Event, Recipe, RecipeIngredient } from "../types";
import { prettyNum, safeNumber } from "./utils";

type TotalsMap = Record<string, { qty: number; unit: string }>;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Берём ингредиенты из рецептов мероприятия и суммируем.
 * Важно: единицы должны совпадать, иначе лучше завести два разных ингредиента/каталога.
 */
export function calcIngredientTotals(event: Event, recipes: Recipe[]): TotalsMap {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const totals: TotalsMap = {};

  for (const line of event.recipes ?? []) {
    const recipe = byId.get(line.recipeId);
    if (!recipe) continue;
    const mult = safeNumber(line.portions, 0);

    for (const ing of recipe.ingredients ?? []) {
      const key = normalize(ing.name) + "||" + ing.unit;
      totals[key] ??= { qty: 0, unit: ing.unit };
      totals[key].qty += safeNumber(ing.qty, 0) * mult;
    }
  }
  return totals;
}

function matchCatalog(ingNameLower: string, catalog: CatalogItem[]) {
  // сначала более длинные match — точнее
  const sorted = [...catalog].sort((a, b) => b.match.length - a.match.length);
  return sorted.find((c) => ingNameLower.includes(normalize(c.match)));
}

/**
 * Строит WhatsApp-текст, максимально близко к твоему примеру.
 * Каталог — ключевой: он задаёт секции, названия, округление бутылок и ссылки.
 */
export function buildWhatsAppShoppingText(args: {
  event: Event;
  recipes: Recipe[];
  catalog: CatalogItem[];
  includeOptional?: boolean;
  includeEventMeta?: boolean;
}) {
  const { event, recipes, catalog } = args;
  const includeOptional = args.includeOptional ?? true;
  const includeEventMeta = args.includeEventMeta ?? false;

  // (1) соберём подробный список ингредиентов с именами
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const ingredientLines: { name: string; unit: string; qty: number; optional?: boolean }[] = [];

  for (const line of event.recipes ?? []) {
    const recipe = byId.get(line.recipeId);
    if (!recipe) continue;
    const mult = safeNumber(line.portions, 0);
    for (const ing of recipe.ingredients ?? []) {
      if (!includeOptional && ing.optional) continue;
      ingredientLines.push({
        name: ing.name,
        unit: ing.unit,
        qty: safeNumber(ing.qty, 0) * mult,
        optional: ing.optional,
      });
    }
  }

  // (2) агрегируем под каталог
  const grouped: Record<string, { catalog: CatalogItem; qty: number; unit: string }> = {};

  for (const ing of ingredientLines) {
    const c = matchCatalog(normalize(ing.name), catalog);
    if (!c) continue;
    const key = c.id;
    grouped[key] ??= { catalog: c, qty: 0, unit: ing.unit };
    grouped[key].qty += ing.qty;
  }

  const sections: Record<string, { c: CatalogItem; displayQty: string }[]> = {};

  for (const g of Object.values(grouped)) {
    const c = g.catalog;
    const qty = g.qty;
    const packSize = safeNumber(c.packSize, 0);
    let displayQty = "";

    if (packSize > 0) {
      // считаем "сколько упаковок/бутылок"
      const nPacks = Math.ceil(qty / packSize);
      displayQty = `${nPacks} ${c.purchaseUnitLabel}`;
    } else {
      displayQty = `${prettyNum(qty)} ${c.purchaseUnitLabel}`;
    }

    sections[c.section] ??= [];
    sections[c.section].push({ c, displayQty });
  }

  // сортировка: по секции, затем по названию
  for (const k of Object.keys(sections)) {
    sections[k].sort((a, b) => a.c.title.localeCompare(b.c.title, "ru"));
  }

  const lines: string[] = [];
  lines.push("*❗️СПИСОК ЗАКУПКИ❗️*");
  lines.push("");

  for (const sec of CATALOG_SECTIONS.slice().sort((a, b) => a.order - b.order)) {
    const items = sections[sec.key];
    const manual = (event.manualBySection as any)?.[sec.key] as string | undefined;
    if (!items?.length && !manual?.trim()) continue;

    lines.push(`*${sec.title}:*`);
    for (const it of items ?? []) {
      const note = it.c.brandsNote ? ` (_${it.c.brandsNote}_)` : "";
      const url = it.c.url ? ` —> ${it.c.url}` : "";
      lines.push(`- *${it.c.title}* - *${it.displayQty}*${note}${url}`);
    }

    if (manual?.trim()) {
      // manual строки вставляем как есть (чтобы сохранить форматирование WhatsApp)
      manual
        .split(/\r?\n/)
        .map((x) => x.trimEnd())
        .filter((x) => x.length > 0)
        .forEach((x) => lines.push(x));
    }

    lines.push("");
  }


  // Fallback: если по каталогу ничего не заматчилось — покажем сырые ингредиенты
  const usedCount = Object.values(grouped).length;
  if (usedCount === 0 && ingredientLines.length > 0) {
    lines.push("*Ингредиенты (черновик, без каталога):*");
    const temp: Record<string, number> = {};
    for (const ing of ingredientLines) {
      const k = `${ing.name} (${ing.unit})`;
      temp[k] = (temp[k] ?? 0) + ing.qty;
    }
    Object.entries(temp)
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .forEach(([k, v]) => lines.push(`- ${k}: ${prettyNum(v)}`));
    lines.push("");
    lines.push("_Подсказка: добавь позиции в «Каталог закупки», и формат станет как в примере._");
  }

  if (includeEventMeta) {
    // Опционально добавляем данные мероприятия внизу, но в WhatsApp-шаблон по умолчанию не включаем.
    lines.push(`*Мероприятие:* ${event.title}`);
    if (event.dateISO) lines.push(`*Дата:* ${event.dateISO}`);
    if (event.loftName) lines.push(`*Лофт:* ${event.loftName}`);
    if (event.clientName) lines.push(`*Клиент:* ${event.clientName}`);
    if (event.clientPhone) lines.push(`*Тел:* ${event.clientPhone}`);
  }

  return lines.join("\n").trim() + "\n";
}
