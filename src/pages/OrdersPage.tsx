import { useMemo, useState } from "react";
import CardHeader from "../components/CardHeader";
import Modal from "../components/Modal";
import { createAt, removeAt, updateAt } from "../lib/db";
import { useList } from "../lib/hooks";
import { nowTs } from "../lib/utils";
import { buildWhatsAppShoppingText } from "../lib/whatsapp";
import { CatalogItem, Event, Order, OrderStatus, Recipe } from "../types";

function emptyOrder(): Omit<Order, "id"> {
  const ts = nowTs();
  return {
    status: "в работе",
    bartender: "",
    loftName: "",
    clientName: "",
    peopleText: "",
    clientPhone: "",
    eventDate: "",
    prepayText: "",
    timing: "",
    barMenuText: "",
    extraPayText: "",
    shoppingStatus: "",
    comments: "",
    hoursCost: 0,
    loftExpense: 0,
    extraServicesCost: 0,
    totalCost: 0,
    myIncome: 0,
    eventId: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

const STATUS: OrderStatus[] = ["в работе", "заказ отправлен", "проведен", "отменен"];

export default function OrdersPage() {
  const { items: orders } = useList<Order>("/orders");
  const { items: events } = useList<Event>("/events");
  const { items: recipes } = useList<Recipe>("/recipes");
  const { items: catalog } = useList<CatalogItem>("/catalog");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [draft, setDraft] = useState<Omit<Order, "id">>(emptyOrder());

  const [whatsOpen, setWhatsOpen] = useState(false);
  const [whatsText, setWhatsText] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = [...orders];
    arr.sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "") || (b.createdAt ?? 0) - (a.createdAt ?? 0));
    if (!qq) return arr;
    return arr.filter((o) =>
      [o.loftName, o.clientName, o.bartender, o.status].filter(Boolean).join(" ").toLowerCase().includes(qq)
    );
  }, [orders, q]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyOrder());
    setOpen(true);
  }
  function openEdit(o: Order) {
    setEditing(o);
    setDraft({ ...o, id: undefined } as any);
    setOpen(true);
  }

  async function save() {
    const ts = nowTs();
    const data = { ...draft, updatedAt: ts };
    if (!data.status) return alert("Статус обязателен.");
    if (editing) await updateAt(`/orders/${editing.id}`, data);
    else await createAt("/orders", { ...data, createdAt: ts });
    setOpen(false);
  }

  async function del(o: Order) {
    if (!confirm("Удалить заказ?")) return;
    await removeAt(`/orders/${o.id}`);
  }

  async function openWhatsApp(o: Order) {
    const ev = events.find((e) => e.id === o.eventId);
    if (!ev) {
      setWhatsText("Заказ не привязан к мероприятию. Открой заказ → выбери мероприятие.");
      setWhatsOpen(true);
      return;
    }
    const txt = buildWhatsAppShoppingText({ event: ev, recipes, catalog, includeOptional: true });
    setWhatsText(txt);
    setWhatsOpen(true);
  }

  async function copy() {
    await navigator.clipboard.writeText(whatsText);
    alert("Скопировано в буфер.");
  }

  return (
    <div className="space-y-4">
      <CardHeader
        title="Заказы"
        subtitle="Таблица заказов (как в твоём Excel), но связанная с карточкой мероприятия — список закупки берётся оттуда."
        right={
          <button className="btn" onClick={openCreate}>
            + Новый заказ
          </button>
        }
      />

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div>
            <div className="label">Поиск</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="лофт / клиент / бармен / статус" />
          </div>
          <div className="text-xs text-slate-500">Всего: {orders.length}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Бармен</th>
                <th className="p-3 text-left">Лофт</th>
                <th className="p-3 text-left">Клиент</th>
                <th className="p-3 text-left">Дата</th>
                <th className="p-3 text-left">Тайминг</th>
                <th className="p-3 text-left">Список</th>
                <th className="p-3 text-left">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 bg-white">
                  <td className="p-3">
                    <span className="badge">{o.status}</span>
                  </td>
                  <td className="p-3">{o.bartender}</td>
                  <td className="p-3">{o.loftName}</td>
                  <td className="p-3">{o.clientName}</td>
                  <td className="p-3">{o.eventDate}</td>
                  <td className="p-3 whitespace-pre-wrap">{o.timing}</td>
                  <td className="p-3">
                    <button className="btn-secondary" onClick={() => openWhatsApp(o)}>
                      WhatsApp
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => openEdit(o)}>
                        Редактировать
                      </button>
                      <button className="btn-secondary" onClick={() => del(o)}>
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={8}>
                    Пока нет заказов.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={editing ? "Редактировать заказ" : "Новый заказ"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Главное поле — «Мероприятие»: оно связывает заказ с карточкой события (там барная карта и закупка).
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
            <div className="label">Статус</div>
            <select className="input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as any }))}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Бармен</div>
            <input className="input" value={draft.bartender ?? ""} onChange={(e) => setDraft((d) => ({ ...d, bartender: e.target.value }))} />
          </div>
          <div>
            <div className="label">Лофт</div>
            <input className="input" value={draft.loftName ?? ""} onChange={(e) => setDraft((d) => ({ ...d, loftName: e.target.value }))} />
          </div>
          <div>
            <div className="label">Клиент</div>
            <input className="input" value={draft.clientName ?? ""} onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))} />
          </div>
          <div>
            <div className="label">Телефон</div>
            <input className="input" value={draft.clientPhone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, clientPhone: e.target.value }))} />
          </div>
          <div>
            <div className="label">Дата мероприятия</div>
            <input className="input" value={draft.eventDate ?? ""} onChange={(e) => setDraft((d) => ({ ...d, eventDate: e.target.value }))} placeholder="14.02.25" />
          </div>
          <div>
            <div className="label">Предоплата (руб, дата)</div>
            <input className="input" value={draft.prepayText ?? ""} onChange={(e) => setDraft((d) => ({ ...d, prepayText: e.target.value }))} placeholder="10.02.25 4000 руб" />
          </div>
          <div>
            <div className="label">Тайминг</div>
            <input className="input" value={draft.timing ?? ""} onChange={(e) => setDraft((d) => ({ ...d, timing: e.target.value }))} placeholder="с 20:30-00:30 4 часа" />
          </div>

          <div className="md:col-span-2">
            <div className="label">Мероприятие (связь)</div>
            <select className="input" value={draft.eventId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, eventId: e.target.value }))}>
              <option value="">— не выбрано —</option>
              {events
                .slice()
                .sort((a, b) => (b.dateISO ?? "").localeCompare(a.dateISO ?? "") || a.title.localeCompare(b.title, "ru"))
                .map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.dateISO ? `${ev.dateISO} • ` : ""}{ev.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="label">Барная карта (если надо вручную)</div>
            <textarea className="input min-h-[84px]" value={draft.barMenuText ?? ""} onChange={(e) => setDraft((d) => ({ ...d, barMenuText: e.target.value }))} />
          </div>

          <div className="md:col-span-2">
            <div className="label">Комментарии (закупка и т.д.)</div>
            <textarea className="input min-h-[84px]" value={draft.comments ?? ""} onChange={(e) => setDraft((d) => ({ ...d, comments: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={whatsOpen}
        title="WhatsApp • список закупки"
        onClose={() => setWhatsOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">Текст берётся из привязанного мероприятия.</div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setWhatsOpen(false)}>
                Закрыть
              </button>
              <button className="btn" onClick={copy}>
                Скопировать
              </button>
            </div>
          </div>
        }
      >
        <textarea className="input min-h-[340px] font-mono text-xs" readOnly value={whatsText} />
      </Modal>
    </div>
  );
}
