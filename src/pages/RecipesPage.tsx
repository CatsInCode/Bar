import { useMemo, useState } from "react";
import CardHeader from "../components/CardHeader";
import Modal from "../components/Modal";
import { createAt, removeAt, updateAt } from "../lib/db";
import { useList } from "../lib/hooks";
import { nowTs } from "../lib/utils";
import { Recipe, RecipeIngredient } from "../types";
import { nanoid } from "nanoid";

function emptyRecipe(): Omit<Recipe, "id"> {
  const ts = nowTs();
  return { name: "", glass: "", method: "", notes: "", tags: [], ingredients: [], createdAt: ts, updatedAt: ts };
}

export default function RecipesPage() {
  const { items: recipes } = useList<Recipe>("/recipes");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [draft, setDraft] = useState<Omit<Recipe, "id">>(emptyRecipe());

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = [...recipes];
    arr.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return qq ? arr.filter((r) => r.name.toLowerCase().includes(qq)) : arr;
  }, [recipes, q]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyRecipe());
    setOpen(true);
  }

  function openEdit(r: Recipe) {
    setEditing(r);
    const { id: _id, ...next } = r;
    setDraft(next);
    setOpen(true);
  }

  async function save() {
    const ts = nowTs();
    const data = { ...draft, name: draft.name.trim(), updatedAt: ts };
    if (!data.name) return alert("Название рецепта обязательно.");
    if (editing) {
      await updateAt(`/recipes/${editing.id}`, data);
    } else {
      await createAt("/recipes", { ...data, createdAt: ts });
    }
    setOpen(false);
  }

  async function del(r: Recipe) {
    if (!confirm(`Удалить рецепт «${r.name}»?`)) return;
    await removeAt(`/recipes/${r.id}`);
  }

  function addIngredient() {
    const ing: RecipeIngredient = { id: nanoid(), name: "", qty: 0, unit: "l", optional: false };
    setDraft((d) => ({ ...d, ingredients: [...(d.ingredients ?? []), ing] }));
  }

  function updateIngredient(id: string, patch: Partial<RecipeIngredient>) {
    setDraft((d) => ({
      ...d,
      ingredients: (d.ingredients ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }

  function removeIngredient(id: string) {
    setDraft((d) => ({ ...d, ingredients: (d.ingredients ?? []).filter((x) => x.id !== id) }));
  }

  return (
    <div className="space-y-4">
      <CardHeader
        title="Рецепты"
        subtitle="Храни, редактируй и быстро находи рецепты по названию. Рецепты потом используются в мероприятиях."
        right={
          <button className="btn" onClick={openCreate}>
            + Новый рецепт
          </button>
        }
      />

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div>
            <div className="label">Поиск по названию</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например: Негрони" />
          </div>
          <div className="text-xs text-slate-500">Всего: {recipes.length}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-slate-900">{r.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {r.glass ? `Бокал: ${r.glass} • ` : ""}ингр.: {r.ingredients?.length ?? 0}
                </div>
                {r.method ? <div className="mt-2 text-sm text-slate-700">Метод: {r.method}</div> : null}
                {r.notes ? <div className="mt-2 text-sm text-slate-600">{r.notes}</div> : null}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => openEdit(r)}>
                  Редактировать
                </button>
                <button className="btn-secondary" onClick={() => del(r)}>
                  Удалить
                </button>
              </div>
            </div>

            {r.ingredients?.length ? (
              <div className="mt-3 grid gap-2">
                {r.ingredients.slice(0, 6).map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-sm font-semibold text-slate-800">
                      {i.name || <span className="text-slate-400">без названия</span>}
                      {i.optional ? <span className="ml-2 badge">опц.</span> : null}
                    </div>
                    <div className="text-sm text-slate-700">
                      {i.qty} {i.unit}
                    </div>
                  </div>
                ))}
                {r.ingredients.length > 6 ? <div className="text-xs text-slate-500">… ещё {r.ingredients.length - 6}</div> : null}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">Ингредиенты не заданы.</div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={open}
        title={editing ? "Редактировать рецепт" : "Новый рецепт"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Подсказка: опциональные ингредиенты (гарниры) можно выключать при генерации списка.
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
            <input className="input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <div className="label">Бокал/посуда</div>
            <input className="input" value={draft.glass ?? ""} onChange={(e) => setDraft((d) => ({ ...d, glass: e.target.value }))} />
          </div>
          <div>
            <div className="label">Метод</div>
            <input className="input" value={draft.method ?? ""} onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))} placeholder="Шейк / Билд / Стир..." />
          </div>
          <div>
            <div className="label">Теги (через запятую)</div>
            <input
              className="input"
              value={(draft.tags ?? []).join(", ")}
              onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
              placeholder="классика, шот, лимонадник..."
            />
          </div>
          <div className="md:col-span-2">
            <div className="label">Заметки</div>
            <textarea className="input min-h-[72px]" value={draft.notes ?? ""} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Ингредиенты</div>
            <div className="text-xs text-slate-500">qty — это количество на 1 порцию/батч.</div>
          </div>
          <button className="btn-secondary" onClick={addIngredient}>
            + Добавить
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {(draft.ingredients ?? []).map((i) => (
            <div key={i.id} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_120px_90px_110px_auto] md:items-end">
              <div>
                <div className="label">Ингредиент</div>
                <input className="input" value={i.name} onChange={(e) => updateIngredient(i.id, { name: e.target.value })} placeholder="Например: Джин сухой" />
              </div>
              <div>
                <div className="label">qty</div>
                <input className="input" inputMode="decimal" value={String(i.qty)} onChange={(e) => updateIngredient(i.id, { qty: Number(e.target.value.replace(",", ".")) || 0 })} />
              </div>
              <div>
                <div className="label">unit</div>
                <select className="input" value={i.unit} onChange={(e) => updateIngredient(i.id, { unit: e.target.value as any })}>
                  <option value="l">l</option>
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                  <option value="unit">unit</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!i.optional} onChange={(e) => updateIngredient(i.id, { optional: e.target.checked })} />
                опционально
              </label>
              <button className="btn-secondary" onClick={() => removeIngredient(i.id)}>
                Удалить
              </button>
            </div>
          ))}
          {!draft.ingredients?.length ? <div className="text-sm text-slate-500">Пока пусто. Добавь ингредиенты.</div> : null}
        </div>
      </Modal>
    </div>
  );
}
