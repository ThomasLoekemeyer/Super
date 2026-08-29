"use client";

// Inventario completo agrupado por categoría, con edición rápida de
// stock (+/−, fijar cantidad) y de objetivos (mínimo / objetivo).

import { useEffect, useMemo, useState } from "react";
import * as inventory from "@/lib/services/inventoryService";
import { STATUS_BADGE, STATUS_LABEL, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () =>
    inventory.listProducts().then(setProducts).catch((e) => setMessage(String(e.message ?? e)));

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? products.filter((p) => p.name.toLowerCase().includes(f))
      : products;
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries());
  }, [products, filter]);

  async function adjust(p: Product, delta: number) {
    try {
      if (p.stock_quantity == null) return;
      const updated =
        delta > 0
          ? await inventory.purchase(p.id, delta, "Ajuste rápido +")
          : await inventory.consume(p.id, -delta, "Ajuste rápido −");
      setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Inventario 📦</h1>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar producto…"
        className="w-full rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm outline-none focus:border-emerald-500"
      />

      {message && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>
      )}

      {grouped.map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-neutral-500">
            {category}
          </h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {items.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-neutral-100 p-3 last:border-b-0"
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(p)}>
                  <div className="truncate text-sm font-semibold">
                    {p.name}
                    {p.brand_preference && (
                      <span className="ml-1 text-xs font-normal text-neutral-400">
                        ({p.brand_preference})
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${STATUS_BADGE[p.stock_status]}`}>
                      {STATUS_LABEL[p.stock_status]}
                    </span>
                    {p.stock_target != null && (
                      <span className="text-neutral-400">
                        objetivo {fmtQty(p.stock_target)}
                        {p.stock_minimum != null ? ` · mín ${fmtQty(p.stock_minimum)}` : ""}
                      </span>
                    )}
                  </div>
                </button>
                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={() => adjust(p, -1)}
                    disabled={p.stock_quantity == null || p.stock_quantity <= 0}
                    className="h-8 w-8 rounded-full bg-neutral-100 font-bold disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold">
                    {fmtQty(p.stock_quantity)}
                  </span>
                  <button
                    onClick={() => adjust(p, 1)}
                    disabled={p.stock_quantity == null}
                    className="h-8 w-8 rounded-full bg-neutral-100 font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {editing && (
        <EditSheet
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditSheet({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [qty, setQty] = useState(product.stock_quantity?.toString() ?? "");
  const [target, setTarget] = useState(product.stock_target?.toString() ?? "");
  const [min, setMin] = useState(product.stock_minimum?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let updated = await inventory.updateProduct(product.id, {
        stock_target: target === "" ? null : parseFloat(target),
        stock_minimum: min === "" ? null : parseFloat(min),
      });
      const newQty = qty === "" ? null : parseFloat(qty);
      if (newQty != null && newQty !== product.stock_quantity) {
        updated = await inventory.setStock(product.id, newQty, "Edición manual");
      }
      onSaved(updated);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{product.name}</h3>
        <p className="text-xs text-neutral-400">{STATUS_LABEL[product.stock_status]}</p>
        {product.notes && <p className="mt-1 text-xs text-neutral-500">{product.notes}</p>}

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-neutral-500">Stock actual ({product.unit})</span>
            <input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="desconocido"
              className="mt-1 w-full rounded-xl border border-neutral-200 p-3"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-neutral-500">Stock mínimo</span>
              <input
                type="number"
                inputMode="decimal"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="sin definir"
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3"
              />
            </label>
            <label className="block text-sm">
              <span className="text-neutral-500">Stock objetivo</span>
              <input
                type="number"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="sin definir"
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3"
              />
            </label>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-emerald-600 p-3 font-semibold text-white disabled:opacity-40"
          >
            Guardar
          </button>
          <button onClick={onClose} className="rounded-xl bg-neutral-100 px-5">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
