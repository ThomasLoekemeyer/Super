"use client";

// Compra: lista de reposición automática (derivada del inventario, nunca
// hardcodeada), "stock a revisar", y ciclo de vida de listas de compra.
// El stock solo aumenta cuando la lista se marca como RECIBIDA.

import { useEffect, useState } from "react";
import * as shopping from "@/lib/services/shoppingService";
import { fmtQty } from "@/lib/format";
import type {
  ReplenishmentSuggestion,
  ShoppingList,
  ShoppingListItem,
  StockReviewItem,
} from "@/lib/types";

const STATUS_ES: Record<string, string> = {
  draft: "Borrador",
  generated: "Generada",
  cart_prepared: "Carrito armado",
  ordered: "Pedida",
  received: "Recibida ✓",
  cancelled: "Cancelada",
};

const NEXT_STATUS: Record<string, { to: "cart_prepared" | "ordered" | "cancelled"; label: string }[]> = {
  generated: [
    { to: "cart_prepared", label: "Carrito armado" },
    { to: "cancelled", label: "Cancelar" },
  ],
  cart_prepared: [
    { to: "ordered", label: "Marcar pedida" },
    { to: "cancelled", label: "Cancelar" },
  ],
  ordered: [{ to: "cancelled", label: "Cancelar" }],
};

export default function CompraPage() {
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[] | null>(null);
  const [review, setReview] = useState<StockReviewItem[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [openList, setOpenList] = useState<ShoppingList | null>(null);
  const [openItems, setOpenItems] = useState<ShoppingListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const [s, r, l] = await Promise.all([
        shopping.getSuggestions(),
        shopping.getStockReview(),
        shopping.listShoppingLists(),
      ]);
      setSuggestions(s);
      setReview(r);
      setLists(l.filter((x) => x.status !== "cancelled"));
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const id = await shopping.generateList(
        `Compra ${new Date().toLocaleDateString("es-AR")}`,
      );
      await load();
      const created = (await shopping.listShoppingLists()).find((l) => l.id === id);
      if (created) await openListDetail(created);
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function openListDetail(list: ShoppingList) {
    setOpenList(list);
    setOpenItems(await shopping.getListItems(list.id));
  }

  async function transition(list: ShoppingList, to: "cart_prepared" | "ordered" | "cancelled") {
    setBusy(true);
    try {
      await shopping.setListStatus(list.id, to);
      await load();
      setOpenList(null);
    } finally {
      setBusy(false);
    }
  }

  async function receive(list: ShoppingList) {
    setBusy(true);
    try {
      await shopping.receiveList(list.id);
      setMessage("✅ Compra recibida: se registraron los movimientos y subió el stock.");
      setOpenList(null);
      await load();
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Compra 🛒</h1>

      {message && (
        <div className="rounded-2xl bg-white p-3 text-sm shadow-sm">{message}</div>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
            Sugerencia de reposición
          </h2>
          <span className="text-xs text-neutral-400">{suggestions?.length ?? "…"} ítems</span>
        </div>
        {!suggestions ? (
          <p className="mt-2 text-sm text-neutral-400">Cargando…</p>
        ) : suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No hay nada para comprar 🎉</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {suggestions.map((s) => (
              <li key={s.product_id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">
                    {s.name}
                    {s.brand_preference && (
                      <span className="ml-1 text-xs text-neutral-400">({s.brand_preference})</span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {s.reason === "pedido_explicito"
                      ? "pedido explícito"
                      : s.reason === "sin_stock"
                        ? "sin stock"
                        : `stock ${fmtQty(s.stock_quantity)} / objetivo ${fmtQty(s.stock_target)}`}
                  </div>
                </div>
                <span className="font-bold">
                  {s.buy_quantity != null ? `${fmtQty(s.buy_quantity)} ${s.unit}` : "a criterio"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={generate}
          disabled={busy || !suggestions || suggestions.length === 0}
          className="mt-3 w-full rounded-xl bg-neutral-900 p-3 font-semibold text-white disabled:opacity-40"
        >
          Generar lista de compra
        </button>
      </section>

      {review.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700">
            Stock a revisar
          </h2>
          <p className="mt-1 text-xs text-amber-700">
            Estado desconocido: revisalos en casa y actualizá el stock. No se compra automáticamente.
          </p>
          <ul className="mt-2 space-y-1">
            {review.map((r) => (
              <li key={r.product_id} className="text-sm text-amber-900">
                • {r.name}
                {r.stock_minimum != null && r.stock_target != null && (
                  <span className="text-xs text-amber-600">
                    {" "}
                    (mantener {fmtQty(r.stock_minimum)}–{fmtQty(r.stock_target)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lists.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-neutral-500">
            Listas
          </h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => openListDetail(l)}
                className="flex w-full items-center justify-between border-b border-neutral-100 p-3 text-left text-sm last:border-b-0"
              >
                <span className="font-medium">{l.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    l.status === "received"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {STATUS_ES[l.status]}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {openList && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpenList(null)}>
          <div
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-bold">{openList.name}</h3>
              <span className="text-xs text-neutral-400">{STATUS_ES[openList.status]}</span>
            </div>
            <ul className="mt-3 divide-y divide-neutral-100">
              {openItems.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={it.checked}
                      onChange={async (e) => {
                        await shopping.updateItem(it.id, { checked: e.target.checked });
                        setOpenItems((prev) =>
                          prev.map((x) => (x.id === it.id ? { ...x, checked: e.target.checked } : x)),
                        );
                      }}
                    />
                    <span className={it.checked ? "text-neutral-400 line-through" : ""}>
                      {it.product_name}
                    </span>
                  </label>
                  <span className="font-semibold">
                    {it.quantity != null ? `${fmtQty(it.quantity)} ${it.unit ?? ""}` : "a criterio"}
                  </span>
                </li>
              ))}
            </ul>

            {openList.status !== "received" && openList.status !== "cancelled" && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => receive(openList)}
                  disabled={busy}
                  className="w-full rounded-xl bg-emerald-600 p-3 font-semibold text-white disabled:opacity-40"
                >
                  ✓ Recibida (sumar al stock)
                </button>
                <div className="flex gap-2">
                  {(NEXT_STATUS[openList.status] ?? []).map((t) => (
                    <button
                      key={t.to}
                      onClick={() => transition(openList, t.to)}
                      disabled={busy}
                      className="flex-1 rounded-xl bg-neutral-100 p-2.5 text-sm disabled:opacity-40"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
