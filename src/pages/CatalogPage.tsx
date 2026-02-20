import { useMemo, useState } from "react";
import CardHeader from "../components/CardHeader";
import Modal from "../components/Modal";
import { createAt, removeAt, updateAt } from "../lib/db";
import { useList } from "../lib/hooks";
import { nowTs } from "../lib/utils";
import { CatalogItem, CATALOG_SECTIONS } from "../types";

function emptyItem(): Omit<CatalogItem, "id"> {
  const ts = nowTs();
  return {
    match: "",
    title: "",
    section: "ingredients",
    purchaseUnitLabel: "л.",
    packSize: 0,
    packUnit: "l",
    brandsNote: "",
    url: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

export default function CatalogPage() {
  const { items } = useList<CatalogItem>("/catalog");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [draft, setDraft] = useState<Omit<CatalogItem, "id">>(emptyItem());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = [...items];
    arr.sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title, "ru"));
    if (!qq) return arr;
    return arr.filter((x) => x.title.toLowerCase().includes(qq) || x.match.toLowerCase().includes(qq));
  }, [items, q]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyItem());
    setOpen(true);
  }
  function openEdit(it: CatalogItem) {
    setEditing(it);
    const { id: _id, ...next } = it;
    setDraft(next);
    setOpen(true);
  }

  async function save() {
    const ts = nowTs();
    const data = { ...draft, match: draft.match.trim(), title: draft.title.trim(), updatedAt: ts };
    if (!data.match || !data.title) return alert("Нужны match и title.");
    if (editing) await updateAt(`/catalog/${editing.id}`, data);
    else await createAt("/catalog", { ...data, createdAt: ts });
    setOpen(false);
  }

  async function del(it: CatalogItem) {
    if (!confirm(`Удалить позицию «${it.title}»?`)) return;
    await removeAt(`/catalog/${it.id}`);
  }

  return (
    <div className="space-y-4">
      <CardHeader
        title="Каталог закупки"
        subtitle="Это «словарь», который превращает ингредиенты из рецептов в красивый WhatsApp-формат: секции, названия, округления по бутылкам/пачкам, бренды и ссылки."
        right={
          <button className="btn" onClick={openCreate}>
            + Новая позиция
          </button>
        }
      />

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div>
            <div className="label">Поиск (match или title)</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например: джин / сироп / кола" />
          </div>
          <div className="text-xs text-slate-500">Всего: {items.length}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((it) => (
          <div key={it.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-slate-900">{it.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  match: <span className="font-mono">{it.match}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="badge">
                    {CATALOG_SECTIONS.find((x) => x.key === it.section)?.title ?? it.section}
                  </span>
                  <span className="badge">
                    {it.packSize && it.packSize > 0 ? `округление: ${it.packSize} ${it.packUnit}` : "без округления"}
                  </span>
                  <span className="badge">вывод: {it.purchaseUnitLabel}</span>
                </div>
                {it.brandsNote ? <div className="mt-2 text-sm text-slate-700">Бренды: {it.brandsNote}</div> : null}
                {it.url ? (
                  <a className="mt-2 block text-sm font-semibold text-slate-900 underline" href={it.url} target="_blank" rel="noreferrer">
                    Ссылка
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <button className="btn-secondary" onClick={() => openEdit(it)}>
                  Редактировать
                </button>
                <button className="btn-secondary" onClick={() => del(it)}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        title={editing ? "Редактировать позицию каталога" : "Новая позиция каталога"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              match — кусок текста, который должен встречаться в названии ингредиента рецепта (например: «джин», «сироп манго», «игристое»).
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
            <div className="label">match</div>
            <input className="input" value={draft.match} onChange={(e) => setDraft((d) => ({ ...d, match: e.target.value }))} placeholder="джин сухой" />
          </div>
          <div>
            <div className="label">title (как в WhatsApp)</div>
            <input className="input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Джин сухой" />
          </div>
          <div>
            <div className="label">Секция</div>
            <select className="input" value={draft.section} onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value as any }))}>
              {CATALOG_SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">purchaseUnitLabel (как выводить)</div>
            <input className="input" value={draft.purchaseUnitLabel} onChange={(e) => setDraft((d) => ({ ...d, purchaseUnitLabel: e.target.value }))} placeholder="л. / бут. / шт. / пачка" />
          </div>
          <div>
            <div className="label">packSize (округление, 0 = нет)</div>
            <input className="input" inputMode="decimal" value={String(draft.packSize ?? 0)} onChange={(e) => setDraft((d) => ({ ...d, packSize: Number(e.target.value.replace(",", ".")) || 0 }))} />
          </div>
          <div>
            <div className="label">packUnit</div>
            <select className="input" value={draft.packUnit ?? "l"} onChange={(e) => setDraft((d) => ({ ...d, packUnit: e.target.value as any }))}>
              <option value="l">l</option>
              <option value="kg">kg</option>
              <option value="pcs">pcs</option>
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="unit">unit</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="label">brandsNote (в скобках курсивом)</div>
            <input className="input" value={draft.brandsNote ?? ""} onChange={(e) => setDraft((d) => ({ ...d, brandsNote: e.target.value }))} placeholder="Beefeater, Gordon’s" />
          </div>
          <div className="md:col-span-2">
            <div className="label">url (→ ...)</div>
            <input className="input" value={draft.url ?? ""} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://ozon.ru/..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
