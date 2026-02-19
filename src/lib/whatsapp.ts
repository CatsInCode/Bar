import { Event, Recipe } from "../types";
import { prettyNum, safeNumber } from "./utils";

type TotalsMap = Record<string, { qty: number; unit: string }>;

function normalize(s: string) {
  return s.trim().toLowerCase();
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
 * Строит WhatsApp-текст напрямую из ингредиентов рецептов (без каталога закупки).
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
  const ingredientTotals: Record<string, { name: string; unit: string; qty: number }> = {};

  for (const line of event.recipes ?? []) {
    const recipe = byId.get(line.recipeId);
    if (!recipe) continue;
    const mult = safeNumber(line.portions, 0);

    for (const ing of recipe.ingredients ?? []) {
      if (!includeOptional && ing.optional) continue;
      const name = (ing.name ?? "").trim();
      if (!name) continue;
      const key = `${normalize(name)}||${ing.unit}`;
      ingredientTotals[key] ??= { name, unit: ing.unit, qty: 0 };
      ingredientTotals[key].qty += safeNumber(ing.qty, 0) * mult;
    }
  }

  const items = Object.values(ingredientTotals).sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const lines: string[] = [];
  lines.push("*❗️СПИСОК ЗАКУПКИ❗️*");
  lines.push("");
  lines.push("*Ингредиенты:*");

  if (items.length === 0) {
    lines.push("- Список пуст: добавь рецепты и порции в мероприятии.");
  } else {
    for (const item of items) {
      lines.push(`- *${item.name}* - *${prettyNum(item.qty)} ${item.unit}*`);
    }
  }

  const manualBlocks = Object.values(event.manualBySection ?? {})
    .map((val) => (val ?? "").trim())
    .filter(Boolean);

  if (manualBlocks.length > 0) {
    lines.push("");
    lines.push("*Дополнительно:*");
    for (const block of manualBlocks) {
      block
        .split(/\r?\n/)
        .map((x) => x.trimEnd())
        .filter((x) => x.length > 0)
        .forEach((x) => lines.push(x));
    }
  }

  if (includeEventMeta) {
    lines.push("");
    lines.push(`*Мероприятие:* ${event.title}`);
    if (event.dateISO) lines.push(`*Дата:* ${event.dateISO}`);
    if (event.loftName) lines.push(`*Лофт:* ${event.loftName}`);
    if (event.clientName) lines.push(`*Клиент:* ${event.clientName}`);
    if (event.clientPhone) lines.push(`*Тел:* ${event.clientPhone}`);
  }

  return lines.join("\n").trim() + "\n";
}
