import { CATALOG_SECTIONS, CatalogSection, Event, Recipe } from "../types";
import { prettyNum, safeNumber } from "./utils";

type TotalsMap = Record<string, { qty: number; unit: string }>;

type ShoppingLine = {
  section: CatalogSection;
  title: string;
  displayQty: string;
  brandsNote?: string;
  url?: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function defaultPurchaseUnit(unit: string) {
  if (unit === "pcs") return "шт.";
  if (unit === "kg") return "кг.";
  if (unit === "g") return "гр.";
  if (unit === "ml") return "мл.";
  if (unit === "l") return "л.";
  return "ед.";
}

/**
 * Берём ингредиенты из рецептов мероприятия и суммируем.
 * Важно: единицы должны совпадать, иначе лучше завести два разных ингредиента.
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

/**
 * Строит WhatsApp-текст по заданному шаблону, используя данные прямо из ингредиентов рецептов.
 */
export function buildWhatsAppShoppingText(args: {
  event: Event;
  recipes: Recipe[];
  includeOptional?: boolean;
  includeEventMeta?: boolean;
}) {
  const { event, recipes } = args;
  const includeOptional = args.includeOptional ?? true;
  const includeEventMeta = args.includeEventMeta ?? false;

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const grouped: Record<string, ShoppingLine & { qty: number; packSize?: number; purchaseUnitLabel?: string; sourceUnit: string }> = {};

  for (const line of event.recipes ?? []) {
    const recipe = byId.get(line.recipeId);
    if (!recipe) continue;
    const mult = safeNumber(line.portions, 0);

    for (const ing of recipe.ingredients ?? []) {
      if (!includeOptional && ing.optional) continue;
      const title = (ing.shoppingTitle ?? ing.name ?? "").trim();
      if (!title) continue;
      const section = (ing.section ?? "ingredients") as CatalogSection;
      const brandsNote = (ing.brandsNote ?? "").trim() || undefined;
      const url = (ing.url ?? "").trim() || undefined;
      const purchaseUnitLabel = (ing.purchaseUnitLabel ?? "").trim() || undefined;
      const packSize = safeNumber(ing.packSize, 0) || undefined;
      const sourceUnit = ing.unit;
      const key = [normalize(title), section, brandsNote ?? "", url ?? "", purchaseUnitLabel ?? "", packSize ?? "", sourceUnit].join("||");

      grouped[key] ??= {
        section,
        title,
        qty: 0,
        displayQty: "",
        brandsNote,
        url,
        purchaseUnitLabel,
        packSize,
        sourceUnit,
      };
      grouped[key].qty += safeNumber(ing.qty, 0) * mult;
    }
  }

  const bySection: Record<string, ShoppingLine[]> = {};
  for (const row of Object.values(grouped)) {
    const label = row.purchaseUnitLabel || defaultPurchaseUnit(row.sourceUnit);
    const displayQty = row.packSize && row.packSize > 0 ? `${Math.ceil(row.qty / row.packSize)} ${label}` : `${prettyNum(row.qty)} ${label}`;
    bySection[row.section] ??= [];
    bySection[row.section].push({
      section: row.section,
      title: row.title,
      displayQty,
      brandsNote: row.brandsNote,
      url: row.url,
    });
  }

  for (const key of Object.keys(bySection)) {
    bySection[key].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }

  const lines: string[] = [];
  lines.push("*❗️СПИСОК ЗАКУПКИ❗️*");
  lines.push("");

  for (const sec of CATALOG_SECTIONS.slice().sort((a, b) => a.order - b.order)) {
    const items = bySection[sec.key];
    const manual = (event.manualBySection as any)?.[sec.key] as string | undefined;
    if (!items?.length && !manual?.trim()) continue;

    lines.push(`*${sec.title}:*`);
    for (const item of items ?? []) {
      const note = item.brandsNote ? ` (_${item.brandsNote}_)` : "";
      const url = item.url ? ` —> ${item.url}` : "";
      lines.push(`- *${item.title}* - *${item.displayQty}*${note}${url}`);
    }

    if (manual?.trim()) {
      manual
        .split(/\r?\n/)
        .map((x) => x.trimEnd())
        .filter((x) => x.length > 0)
        .forEach((x) => lines.push(x));
    }

    lines.push("");
  }

  if (lines.length <= 2) {
    lines.push("*Ингредиенты:*", "- Список пуст: добавь рецепты и порции в мероприятии.", "");
  }

  if (includeEventMeta) {
    lines.push(`*Мероприятие:* ${event.title}`);
    if (event.dateISO) lines.push(`*Дата:* ${event.dateISO}`);
    if (event.loftName) lines.push(`*Лофт:* ${event.loftName}`);
    if (event.clientName) lines.push(`*Клиент:* ${event.clientName}`);
    if (event.clientPhone) lines.push(`*Тел:* ${event.clientPhone}`);
  }

  return lines.join("\n").trim() + "\n";
}
