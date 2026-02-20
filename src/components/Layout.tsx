import { NavLink } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "../lib/utils";

function Item({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        )
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="card p-4 h-fit sticky top-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Barmen</div>
                <div className="text-xs text-slate-500">мероприятия • рецепты • заказы</div>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <Item to="/orders">Заказы</Item>
              <Item to="/events">Мероприятия</Item>
              <Item to="/recipes">Рецепты</Item>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">Подсказка</div>
              <div className="mt-1 text-xs text-slate-600">
                Сначала импортируй/создай рецепты → собери мероприятие → получи WhatsApp-список закупки по ингредиентам.
              </div>
            </div>
          </aside>

          <main className="space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
