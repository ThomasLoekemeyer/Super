"use client";

// Registro rápido: texto libre -> parser -> JSON validado -> preview
// -> confirmación -> InventoryService -> Supabase. Nunca SQL desde texto.

import { useEffect, useMemo, useRef, useState } from "react";
import { parseInput, type ParsedAction } from "@/lib/nlp/parser";
import { resolveProduct } from "@/lib/nlp/resolver";
import * as inventory from "@/lib/services/inventoryService";
import * as recipes from "@/lib/services/recipeService";
import { fmtQty } from "@/lib/format";
import type { Product, Recipe } from "@/lib/types";

const EXAMPLES = [
  "Gasté 2 cocas",
  "Usé una leche",
  "Quedan 2 huevos",
  "Compré 6 huevos",
  "Hice pollo con arroz",
];

interface Pending {
  parsed: ParsedAction;
  product: Product | null;
  candidates: Product[];
}

interface MealRow {
  product: Product | null;
  name: string;
  quantity: number;
}

export default function RegistrarPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [mealRows, setMealRows] = useState<MealRow[] | null>(null);
  const [mealRecipe, setMealRecipe] = useState<Recipe | null>(null);
  const [saveAsRecipe, setSaveAsRecipe] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inventory.listProducts().then(setProducts).catch((e) => setMessage(String(e.message ?? e)));
  }, []);

  const frequentProducts = useMemo(
    () =>
      products
        .filter((p) => p.is_recurring && p.stock_status !== "empty")
        .slice(0, 8),
    [products],
  );

  function reset() {
    setPending(null);
    setMealRows(null);
    setMealRecipe(null);
    setInput("");
  }

  async function handleParse() {
    setMessage(null);
    const parsed = parseInput(input);
    if (parsed.action === "unknown") {
      setMessage(
        "No entendí. Probá con: “Gasté 2 cocas”, “Quedan 2 huevos”, “Compré 6 huevos”…",
      );
      return;
    }
    if (parsed.action === "meal") {
      const recipe = await recipes.findRecipeByDescription(parsed.description);
      setMealRecipe(recipe);
      if (recipe) {
        const ings = await recipes.getIngredients(recipe.id);
        setMealRows(
          ings.map((i) => ({
            product: products.find((p) => p.id === i.product_id) ?? null,
            name: i.name,
            quantity: i.quantity ?? 1,
          })),
        );
      } else {
        setMealRows([]);
      }
      setPending({ parsed, product: null, candidates: [] });
      return;
    }
    const { match, candidates } = resolveProduct(parsed.productQuery, products);
    setPending({ parsed, product: match, candidates });
    if (!match && candidates.length === 0) {
      setMessage(`No encontré ningún producto parecido a “${parsed.productQuery}”.`);
      setPending(null);
    }
  }

  async function confirm() {
    if (!pending?.product && pending?.parsed.action !== "meal") return;
    setBusy(true);
    setMessage(null);
    try {
      const p = pending!.parsed;
      const prod = pending!.product!;
      if (p.action === "consume") {
        const updated = await inventory.consume(prod.id, p.quantity, input);
        setMessage(
          updated.stock_quantity == null
            ? `✅ Consumo registrado. Stock de ${prod.name} sigue sin cantidad exacta.`
            : `✅ ${prod.name}: quedan ${fmtQty(updated.stock_quantity)}.`,
        );
      } else if (p.action === "purchase") {
        const updated = await inventory.purchase(prod.id, p.quantity, input);
        setMessage(`✅ ${prod.name}: ahora hay ${fmtQty(updated.stock_quantity)}.`);
      } else if (p.action === "set_stock") {
        const updated = await inventory.setStock(prod.id, p.quantity, input);
        setMessage(`✅ ${prod.name}: stock fijado en ${fmtQty(updated.stock_quantity)}.`);
      } else if (p.action === "deplete") {
        await inventory.deplete(prod.id, input);
        setMessage(`✅ ${prod.name}: marcado sin stock.`);
      }
      const fresh = await inventory.listProducts();
      setProducts(fresh);
      reset();
    } catch (e) {
      setMessage(`Error: ${String((e as Error).message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmMeal() {
    if (!pending || pending.parsed.action !== "meal" || !mealRows) return;
    const desc = pending.parsed.description;
    const rows = mealRows.filter((r) => r.product && r.quantity > 0);
    setBusy(true);
    try {
      await recipes.cookMeal(
        desc,
        rows.map((r) => ({
          product_id: r.product!.id,
          name: r.product!.name,
          quantity: r.quantity,
          unit: r.product!.unit,
        })),
        mealRecipe?.id,
      );
      if (!mealRecipe && saveAsRecipe && rows.length > 0) {
        await recipes.saveRecipe(
          desc,
          2,
          rows.map((r) => ({
            product_id: r.product!.id,
            name: r.product!.name,
            quantity: r.quantity,
            unit: r.product!.unit,
          })),
        );
      }
      setMessage(`✅ Comida registrada: ${desc}${rows.length ? ` (${rows.length} ingredientes descontados)` : " (sin descuentos)"}.`);
      const fresh = await inventory.listProducts();
      setProducts(fresh);
      reset();
    } catch (e) {
      setMessage(`Error: ${String((e as Error).message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function quickConsume(p: Product) {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await inventory.consume(p.id, 1, "Registro rápido");
      setMessage(
        updated.stock_quantity == null
          ? `✅ −1 ${p.name} (cantidad total sigue sin confirmar).`
          : `✅ ${p.name}: quedan ${fmtQty(updated.stock_quantity)}.`,
      );
      setProducts(await inventory.listProducts());
    } catch (e) {
      setMessage(`Error: ${String((e as Error).message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  const actionLabel: Record<string, string> = {
    consume: "Consumir",
    purchase: "Compra",
    set_stock: "Fijar stock en",
    deplete: "Sin stock",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Registrar ✏️</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleParse();
        }}
        className="space-y-2"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: Gasté 2 cocas"
          className="w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm outline-none focus:border-emerald-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="w-full rounded-2xl bg-emerald-600 p-3 font-semibold text-white disabled:opacity-40"
        >
          Interpretar
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setInput(ex)}
            className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500 shadow-sm"
          >
            {ex}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-2xl bg-white p-3 text-sm shadow-sm">{message}</div>
      )}

      {/* Preview de acción simple */}
      {pending && pending.parsed.action !== "meal" && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-neutral-400">Preview</p>
          {pending.product ? (
            <>
              <p className="mt-1 text-sm">
                <span className="font-semibold">
                  {actionLabel[pending.parsed.action]}
                </span>{" "}
                {"quantity" in pending.parsed
                  ? `${fmtQty(pending.parsed.quantity)} × `
                  : ""}
                <span className="font-semibold">{pending.product.name}</span>
                <span className="text-neutral-400">
                  {" "}
                  (stock actual: {fmtQty(pending.product.stock_quantity)}{" "}
                  {pending.product.unit})
                </span>
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirm}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-emerald-600 p-2.5 font-semibold text-white disabled:opacity-40"
                >
                  Confirmar
                </button>
                <button onClick={reset} className="rounded-xl bg-neutral-100 px-4 text-sm">
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm">¿A cuál te referís?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pending.candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPending({ ...pending, product: c })}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview de comida */}
      {pending && pending.parsed.action === "meal" && mealRows && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Comida{mealRecipe ? ` · receta guardada: ${mealRecipe.name}` : " · nueva"}
          </p>
          <p className="mt-1 font-semibold">{pending.parsed.description}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Revisá los ingredientes antes de descontar. Nada se descuenta sin tu OK.
          </p>

          <ul className="mt-3 space-y-2">
            {mealRows.map((row, i) => (
              <li key={i} className="flex items-center gap-2">
                <select
                  value={row.product?.id ?? ""}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value) ?? null;
                    setMealRows(mealRows.map((r, j) => (j === i ? { ...r, product: prod, name: prod?.name ?? r.name } : r)));
                  }}
                  className="flex-1 rounded-xl border border-neutral-200 p-2 text-sm"
                >
                  <option value="">({row.name || "elegir producto"})</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={row.quantity}
                  onChange={(e) =>
                    setMealRows(mealRows.map((r, j) => (j === i ? { ...r, quantity: parseFloat(e.target.value) || 0 } : r)))
                  }
                  className="w-20 rounded-xl border border-neutral-200 p-2 text-sm"
                />
                <button
                  onClick={() => setMealRows(mealRows.filter((_, j) => j !== i))}
                  className="text-neutral-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setMealRows([...(mealRows ?? []), { product: null, name: "", quantity: 1 }])}
            className="mt-2 text-sm font-semibold text-emerald-700"
          >
            + Agregar ingrediente
          </button>

          {!mealRecipe && (
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={saveAsRecipe}
                onChange={(e) => setSaveAsRecipe(e.target.checked)}
              />
              Guardar como receta para reutilizar
            </label>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmMeal}
              disabled={busy}
              className="flex-1 rounded-xl bg-emerald-600 p-2.5 font-semibold text-white disabled:opacity-40"
            >
              Confirmar comida
            </button>
            <button onClick={reset} className="rounded-xl bg-neutral-100 px-4 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
          Consumo rápido (−1)
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {frequentProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => quickConsume(p)}
              disabled={busy}
              className="rounded-xl bg-white p-3 text-left text-sm shadow-sm active:scale-95 disabled:opacity-40"
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-neutral-400">
                stock: {fmtQty(p.stock_quantity)} {p.unit}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
