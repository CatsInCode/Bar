import { useMemo, useState } from "react";
import CardHeader from "../components/CardHeader";
import Modal from "../components/Modal";
import { createAt, removeAt, updateAt } from "../lib/db";
import { useList } from "../lib/hooks";
import { nowTs, safeNumber } from "../lib/utils";
import { buildWhatsAppShoppingText } from "../lib/whatsapp";
import { CatalogItem, Event, Recipe } from "../types";

function emptyEvent(): Omit<Event, "id"> {
  const ts = nowTs();
  return {
    title: "",
    dateISO: "",
    timeStart: "",
    timeEnd: "",
    loftName: "",
    clientName: "",
    clientPhone: "",
    bartender: "",
    guestsDrinkers: 0,
    guestsNonDrinkers: 0,
    comment: "",
    recipes: [],
    manualBySection: {},
    createdAt: ts,
    updatedAt: ts,
  };
}

export default function EventsPage() {
  const { items: events } = useList<Event>("/events");
  const { items: recipes } = useList<Recipe>("/recipes");
  const { items: catalog } = useList<CatalogItem>("/catalog");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [draft, setDraft] = useState<Omit<Event, "id">>(emptyEvent());

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);

  const sorted = useMemo(() => {
    const arr = [...events];
    arr.sort((a, b) => (b.dateISO ?? "").localeCompare(a.dateISO ?? ""));
    return arr;
  }, [events]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyEvent());
    setOpen(true);
  }
  function openEdit(e: Event) {
    setEditing(e);
    setDraft({ ...e, id: undefined } as any);
    setOpen(true);
  }

  async function save() {
    const ts = nowTs();
    const data = { ...draft, title: draft.title.trim(), updatedAt: ts };
    if (!data.title) return alert("Название мероприятия обязательно.");
    if (editing) {
      await updateAt(`/events/${editing.id}`, data);
    } else {
      await createAt("/events", { ...data, createdAt: ts });
    }
    setOpen(false);
  }

  async function del(e: Event) {
    if (!confirm(`Удалить мероприятие «${e.title}»?`)) return;
    await removeAt(`/events/${e.id}`);
  }

  function toggleRecipe(recipeId: string) {
    setDraft((d) => {
      const exists = (d.recipes ?? []).find((x) => x.recipeId === recipeId);
      if (exists) return { ...d, recipes: (d.recipes ?? []).filter((x) => x.recipeId !== recipeId) };
      return { ...d, recipes: [...(d.recipes ?? []), { recipeId, portions: 1 }] };
    });
  }

  function setPortions(recipeId: string, portions: number) {
    setDraft((d) => ({
      ...d,
      recipes: (d.recipes ?? []).map((x) => (x.recipeId === recipeId ? { ...x, portions } : x)),
    }));
  }

  function openPreview(e: Event) {
    setPreviewEvent(e);
    setPreviewOpen(true);
  }

  const previewText = useMemo(() => {
    if (!previewEvent) return "";
    return buildWhatsAppShoppingText({ event: previewEvent, recipes, catalog, includeOptional: true });
  }, [previewEvent, recipes, catalog]);

  async function copyPreview() {
    await navigator.clipboard.writeText(previewText);
    alert("Скопировано в буфер. Вставляй в WhatsApp.");
  }

  return (
    <div className="space-y-4">
      <CardHeader
        title="Мероприятия"
        subtitle="Собирай барную карту из сохранённых рецептов и получай список закупки в WhatsApp-формате."
        right={
          <button className="btn" onClick={openCreate}>
            + Новое мероприятие
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((e) => (
          <div key={e.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-slate-900">{e.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {e.dateISO ? `Дата: ${e.dateISO} • ` : ""}
                  {e.loftName ? `Лофт: ${e.loftName} • ` : ""}
                  напитков: {e.recipes?.length ?? 0}
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {e.clientName ? `Клиент: ${e.clientName}` : "Клиент не указан"}
                  {e.clientPhone ? ` • ${e.clientPhone}` : ""}
                </div>
                {e.comment ? <div className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{e.comment}</div> : null}
              </div>
              <div className="flex flex-col gap-2">
                <button className="btn-secondary" onClick={() => openPreview(e)}>
                  WhatsApp список
                </button>
                <button className="btn-secondary" onClick={() => openEdit(e)}>
                  Редактировать
                </button>
                <button className="btn-secondary" onClick={() => del(e)}>
                  Удалить
                </button>
              </div>
            </div>

            {(e.recipes?.length ?? 0) > 0 ? (
              <div className="mt-3 grid gap-2">
                {e.recipes.slice(0, 6).map((line) => {
                  const r = recipes.find((x) => x.id === line.recipeId);
                  return (
                    <div key={line.recipeId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-semibold text-slate-800">{r?.name ?? "—"}</div>
                      <div className="text-sm text-slate-700">{line.portions} порц.</div>
                    </div>
                  );
                })}
                {e.recipes.length > 6 ? <div className="text-xs text-slate-500">… ещё {e.recipes.length - 6}</div> : null}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">Барная карта пока пустая.</div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={open}
        title={editing ? "Редактировать мероприятие" : "Новое мероприятие"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Подсказка: количества ставь как «сколько порций нужно» (например 30 дайкири = 30).
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <button className="btn" onClick={save}>
                Сохранить
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="label">Название</div>
            <input className="input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Лофт Октябрь — Алена" />
          </div>
          <div>
            <div className="label">Дата (YYYY-MM-DD)</div>
            <input className="input" value={draft.dateISO ?? ""} onChange={(e) => setDraft((d) => ({ ...d, dateISO: e.target.value }))} />
          </div>
          <div>
            <div className="label">Время начала</div>
            <input className="input" value={draft.timeStart ?? ""} onChange={(e) => setDraft((d) => ({ ...d, timeStart: e.target.value }))} placeholder="20:30" />
          </div>
          <div>
            <div className="label">Время конца</div>
            <input className="input" value={draft.timeEnd ?? ""} onChange={(e) => setDraft((d) => ({ ...d, timeEnd: e.target.value }))} placeholder="00:30" />
          </div>
          <div>
            <div className="label">Лофт</div>
            <input className="input" value={draft.loftName ?? ""} onChange={(e) => setDraft((d) => ({ ...d, loftName: e.target.value }))} />
          </div>
          <div>
            <div className="label">Бармен</div>
            <input className="input" value={draft.bartender ?? ""} onChange={(e) => setDraft((d) => ({ ...d, bartender: e.target.value }))} />
          </div>
          <div>
            <div className="label">Клиент</div>
            <input className="input" value={draft.clientName ?? ""} onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))} />
          </div>
          <div>
            <div className="label">Телефон</div>
            <input className="input" value={draft.clientPhone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, clientPhone: e.target.value }))} placeholder="79991234567" />
          </div>
          <div>
            <div className="label">Пьющие</div>
            <input className="input" inputMode="numeric" value={String(draft.guestsDrinkers ?? 0)} onChange={(e) => setDraft((d) => ({ ...d, guestsDrinkers: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <div className="label">Непьющие</div>
            <input className="input" inputMode="numeric" value={String(draft.guestsNonDrinkers ?? 0)} onChange={(e) => setDraft((d) => ({ ...d, guestsNonDrinkers: Number(e.target.value) || 0 }))} />
          </div>
          <div className="md:col-span-2">
            <div className="label">Комментарий</div>
            <textarea className="input min-h-[72px]" value={draft.comment ?? ""} onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))} />
          </div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-extrabold text-slate-900">Барная карта (из рецептов)</div>
          <div className="text-xs text-slate-500">Отметь рецепты и укажи количество порций для каждого.</div>

          <div className="mt-3 grid gap-2">
            {recipes
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "ru"))
              .map((r) => {
                const checked = !!(draft.recipes ?? []).find((x) => x.recipeId === r.id);
                const portions = (draft.recipes ?? []).find((x) => x.recipeId === r.id)?.portions ?? 1;
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <input type="checkbox" checked={checked} onChange={() => toggleRecipe(r.id)} />
                      {r.name}
                    </label>
                    {checked ? (
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-500">порций</div>
                        <input
                          className="input w-[96px]"
                          inputMode="numeric"
                          value={String(portions)}
                          onChange={(e) => setPortions(r.id, safeNumber(e.target.value, 0))}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>

<div className="mt-5">
  <div className="text-sm font-extrabold text-slate-900">Доп. позиции для WhatsApp (ручной ввод)</div>
  <div className="text-xs text-slate-500">
    Вставляй строки прямо как в WhatsApp (со звёздочками/подчёркиваниями, ценами, ссылками). Они будут добавлены в нужные секции.
  </div>

  <div className="mt-3 grid gap-3 md:grid-cols-2">
    {[
      ["alcohol", "1.0 - Алкоголь"],
      ["ingredients", "2.0 - Ингредиенты"],
      ["soft", "3.0 - Безалкогольные напитки"],
      ["fruits", "4.0 - Фрукты, ягоды"],
      ["consumables", "5.0 - Расходные материалы"],
      ["rental", "6.0 - Аренда посуды и льда"],
      ["other", "Другое"],
    ].map(([key, title]) => (
      <div key={key} className="md:col-span-1">
        <div className="label">{title}</div>
        <textarea
          className="input min-h-[96px] font-mono text-xs"
          value={(draft.manualBySection as any)?.[key] ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              manualBySection: { ...(d.manualBySection ?? {}), [key]: e.target.value },
            }))
          }
          placeholder="- *Сироп сахарный* - *1 бут.* —> https://..."
        />
      </div>
    ))}
  </div>
</div>
        </div>
      </Modal>

      <Modal
        open={previewOpen}
        title="WhatsApp • список закупки"
        onClose={() => setPreviewOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Если формат «не как надо» — добавь/отредактируй позиции в «Каталог закупки» (названия, секции, ссылки, округления).
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setPreviewOpen(false)}>
                Закрыть
              </button>
              <button className="btn" onClick={copyPreview}>
                Скопировать
              </button>
            </div>
          </div>
        }
      >
        <div className="text-sm text-slate-700">
          <div className="label">Предпросмотр</div>
          <textarea className="input min-h-[320px] font-mono text-xs" value={previewText} readOnly />

<div className="mt-5">
  <div className="text-sm font-extrabold text-slate-900">Доп. позиции для WhatsApp (ручной ввод)</div>
  <div className="text-xs text-slate-500">
    Вставляй строки прямо как в WhatsApp (со звёздочками/подчёркиваниями, ценами, ссылками). Они будут добавлены в нужные секции.
  </div>

  <div className="mt-3 grid gap-3 md:grid-cols-2">
    {[
      ["alcohol", "1.0 - Алкоголь"],
      ["ingredients", "2.0 - Ингредиенты"],
      ["soft", "3.0 - Безалкогольные напитки"],
      ["fruits", "4.0 - Фрукты, ягоды"],
      ["consumables", "5.0 - Расходные материалы"],
      ["rental", "6.0 - Аренда посуды и льда"],
      ["other", "Другое"],
    ].map(([key, title]) => (
      <div key={key} className="md:col-span-1">
        <div className="label">{title}</div>
        <textarea
          className="input min-h-[96px] font-mono text-xs"
          value={(draft.manualBySection as any)?.[key] ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              manualBySection: { ...(d.manualBySection ?? {}), [key]: e.target.value },
            }))
          }
          placeholder="- *Сироп сахарный* - *1 бут.* —> https://..."
        />
      </div>
    ))}
  </div>
</div>
        </div>
      </Modal>
    </div>
  );
}
