"use client";

// Dashboard: STOCK BAJO · PRÓXIMA COMPRA · VALOR ESTIMADO · ÚLTIMOS CONSUMOS

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMovements } from "@/lib/services/inventoryService";
import { getSuggestions, getStockReview } from "@/lib/services/shoppingService";
import { fmtDate, fmtMoney, fmtQty } from "@/lib/format";
import type {
  InventoryMovement,
  ReplenishmentSuggestion,
  StockReviewItem,
} from "@/lib/types";

export default function Dashboard() {
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[] | null>(null);
  const [review, setReview] = useState<StockReviewItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSuggestions(), getStockReview(), listMovements(8)])
      .then(([s, r, m]) => {
        setSuggestions(s);
        setReview(r);
        setMovements(m.filter((x) => x.movement_type === "consumption").slice(0, 5));
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  const estimated = suggestions?.reduce((acc, s) => {
    if (s.estimated_price != null && s.buy_quantity != null) {
      return (acc ?? 0) + s.estimated_price * s.buy_quantity;
    }
    return acc;
  }, null as number | null);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Super 🏠</h1>
        <p className="text-sm text-neutral-500">Inventario de casa</p>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/registrar" className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm active:scale-95">
          <div className="text-2xl">✏️</div>
          <div className="mt-1 font-semibold">Registrar consumo</div>
          <div className="text-xs text-emerald-100">“Gasté 2 cocas”</div>
        </Link>
        <Link href="/compra" className="rounded-2xl bg-neutral-900 p-4 text-white shadow-sm active:scale-95">
          <div className="text-2xl">🛒</div>
          <div className="mt-1 font-semibold">Preparar compra</div>
          <div className="text-xs text-neutral-300">
            {suggestions ? `${suggestions.length} productos` : "…"}
          </div>
        </Link>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-600">
            Stock bajo
          </h2>
          <span className="text-xs text-neutral-400">
            {suggestions?.length ?? "…"} productos
          </span>
        </div>
        {!suggestions ? (
          <p className="mt-2 text-sm text-neutral-400">Cargando…</p>
        ) : suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todo en orden 🎉</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {suggestions.slice(0, 8).map((s) => (
              <li key={s.product_id} className="flex items-center justify-between py-1.5 text-sm">
                <span>{s.name}</span>
                <span className="font-semibold text-neutral-700">
                  {s.buy_quantity != null ? `comprar ${fmtQty(s.buy_quantity)}` : "comprar"}
                </span>
              </li>
            ))}
            {suggestions.length > 8 && (
              <li className="py-1.5 text-xs text-neutral-400">
                <Link href="/compra">+ {suggestions.length - 8} más…</Link>
              </li>
            )}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
            Próxima compra
          </h2>
          <p className="mt-1 text-2xl font-bold">{suggestions?.length ?? "…"}</p>
          <p className="text-xs text-neutral-400">ítems sugeridos</p>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
            Valor estimado
          </h2>
          <p className="mt-1 text-2xl font-bold">{fmtMoney(estimated)}</p>
          <p className="text-xs text-neutral-400">
            {estimated == null ? "sin precios cargados" : "según precios estimados"}
          </p>
        </section>
      </div>

      {review.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700">
            Stock a revisar
          </h2>
          <p className="mt-1 text-xs text-amber-700">
            {review.length} productos con estado desconocido. No se asume que faltan.
          </p>
          <p className="mt-1 truncate text-xs text-amber-600">
            {review.map((r) => r.name).join(" · ")}
          </p>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
          Últimos consumos
        </h2>
        {movements.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Todavía no registraste consumos.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                <span>
                  {m.products?.name ?? "—"}{" "}
                  <span className="text-neutral-400">−{fmtQty(m.quantity)}</span>
                </span>
                <span className="text-xs text-neutral-400">{fmtDate(m.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
