export type Id = string;

export type IngredientUnit = "l" | "kg" | "pcs" | "ml" | "g" | "unit";

export type CatalogSection =
  | "alcohol"
  | "ingredients"
  | "soft"
  | "fruits"
  | "consumables"
  | "rental"
  | "other";

export const CATALOG_SECTIONS: { key: CatalogSection; title: string; order: number }[] = [
  { key: "alcohol", title: "1.0 - Алкоголь", order: 1 },
  { key: "ingredients", title: "2.0 - Ингредиенты", order: 2 },
  { key: "soft", title: "3.0 - Безалкогольные напитки", order: 3 },
  { key: "fruits", title: "4.0 - Фрукты, ягоды", order: 4 },
  { key: "consumables", title: "5.0 - Расходные материалы", order: 5 },
  { key: "rental", title: "6.0 - Аренда посуды и льда", order: 6 },
  { key: "other", title: "Другое", order: 99 },
];

export type RecipeIngredient = {
  id: Id;
  name: string;
  qty: number; // кол-во на 1 порцию/батч (как заведёшь в рецепте)
  unit: IngredientUnit;
  optional?: boolean; // гарнир/опционально
  /** Категория для WhatsApp-списка закупки. */
  section?: CatalogSection;
  /** Название для вывода в списке закупки (если отличается от name). */
  shoppingTitle?: string;
  /** Единица закупки для вывода (бут., л., шт., пачка). */
  purchaseUnitLabel?: string;
  /** Размер одной закупочной единицы для округления (например 1 л). */
  packSize?: number;
  /** Подсказки по брендам в курсиве. */
  brandsNote?: string;
  /** Ссылка на товар. */
  url?: string;
};

export type Recipe = {
  id: Id;
  name: string;
  glass?: string;
  method?: string;
  notes?: string;
  tags?: string[];
  ingredients: RecipeIngredient[];
  createdAt: number;
  updatedAt: number;
};

export type EventRecipeLine = {
  recipeId: Id;
  portions: number; // сколько порций/батчей нужно на мероприятие
};

export type Event = {
  id: Id;
  title: string;
  dateISO?: string; // YYYY-MM-DD
  timeStart?: string; // HH:mm
  timeEnd?: string;
  loftName?: string;
  clientName?: string;
  clientPhone?: string;
  bartender?: string;
  guestsDrinkers?: number;
  guestsNonDrinkers?: number;
  comment?: string;
  recipes: EventRecipeLine[];
  /** Ручные строки по секциям для WhatsApp (с форматированием). */
  manualBySection?: Partial<Record<CatalogSection, string>>;
  createdAt: number;
  updatedAt: number;
};

export type CatalogItem = {
  id: Id;
  /** Ключ для матчинга с ингредиентом рецепта (можно часть слова). */
  match: string;
  /** Как отображать в WhatsApp. */
  title: string;
  section: CatalogSection;
  /** В чём считаем закупку (бут, л, кг, шт). */
  purchaseUnitLabel: string; // "бут.", "л.", "кг.", "шт."
  /** Размер одной покупки (например бутылка 1л => 1). Если 0/undefined — не округляем, показываем как есть. */
  packSize?: number;
  /** Единица packSize (l/kg/pcs). */
  packUnit?: IngredientUnit;
  /** Примечание бренды/варианты (в WhatsApp будет в скобках курсивом). */
  brandsNote?: string;
  /** Ссылка (ozon и т.п.). */
  url?: string;
  createdAt: number;
  updatedAt: number;
};

export type OrderStatus = "в работе" | "заказ отправлен" | "проведен" | "отменен";

export type Order = {
  id: Id;
  status: OrderStatus;
  bartender?: string;
  loftName?: string;
  clientName?: string;
  peopleText?: string; // как в таблице: "Пьющие: 30\nНепьющие: 0"
  clientPhone?: string;
  eventDate?: string; // dd.mm.yy или YYYY-MM-DD — как удобнее
  prepayText?: string; // "4000 руб, дата"
  timing?: string; // "с 20:30-00:30 4 часа"
  barMenuText?: string; // список напитков (можно автогенерировать из мероприятия)
  extraPayText?: string; // "к доплате..."
  shoppingStatus?: string; // (ссылка на мероприятие фактически решает это, но оставил поле)
  comments?: string;
  hoursCost?: number;
  loftExpense?: number;
  extraServicesCost?: number;
  totalCost?: number;
  myIncome?: number;
  eventId?: Id; // связь с карточкой мероприятия
  createdAt: number;
  updatedAt: number;
};
