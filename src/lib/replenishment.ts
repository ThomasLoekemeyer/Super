// Motor de reposición: espejo puro (y testeable) de la vista SQL
// public.replenishment_suggestions. La fuente de verdad en producción
// es la vista; este módulo permite testear las reglas sin base de datos
// y calcular previews en el cliente.
//
// Reglas:
//  1. purchase_now_quantity definido -> comprar esa cantidad (pedido explícito).
//  2. empty + (habitual o marcado "necesita compra") -> comprar.
//     Cantidad = stock_target si está definido; null si no.
//  3. known + stock_target definido y stock < COALESCE(stock_minimum, stock_target)
//     -> comprar stock_target - stock. (Rango tipo cerveza 12/15: solo repone
//     al caer bajo el mínimo, y repone hasta el objetivo.)
//  4. Cantidad desconocida sin pedido explícito -> nunca a la lista de compra;
//     va a "stock a revisar".

import type { Product, ReplenishmentSuggestion, StockReviewItem } from "./types";

type ProductLike = Pick<
  Product,
  | "id"
  | "name"
  | "category"
  | "unit"
  | "brand_preference"
  | "stock_quantity"
  | "stock_status"
  | "stock_minimum"
  | "stock_target"
  | "purchase_now_quantity"
  | "is_recurring"
  | "needs_purchase"
  | "estimated_price"
>;

export function buyQuantityFor(p: ProductLike): number | null {
  if (p.purchase_now_quantity != null) return p.purchase_now_quantity;
  if (p.stock_status === "empty" && p.stock_target != null) {
    return Math.max(p.stock_target - (p.stock_quantity ?? 0), 0);
  }
  if (
    p.stock_status === "known" &&
    p.stock_target != null &&
    p.stock_quantity != null &&
    p.stock_quantity < (p.stock_minimum ?? p.stock_target)
  ) {
    return Math.max(p.stock_target - p.stock_quantity, 0);
  }
  return null;
}

export function needsReplenishment(p: ProductLike): boolean {
  if (p.purchase_now_quantity != null) return true;
  if (p.stock_status === "empty" && (p.is_recurring || p.needs_purchase)) {
    return true;
  }
  return (
    p.stock_status === "known" &&
    p.stock_target != null &&
    p.stock_quantity != null &&
    p.stock_quantity < (p.stock_minimum ?? p.stock_target)
  );
}

export function computeSuggestions(
  products: ProductLike[],
): ReplenishmentSuggestion[] {
  return products.filter(needsReplenishment).map((p) => ({
    product_id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    brand_preference: p.brand_preference,
    stock_quantity: p.stock_quantity,
    stock_status: p.stock_status,
    stock_minimum: p.stock_minimum,
    stock_target: p.stock_target,
    estimated_price: p.estimated_price,
    buy_quantity: buyQuantityFor(p),
    is_explicit_request: p.purchase_now_quantity != null,
    reason:
      p.purchase_now_quantity != null
        ? "pedido_explicito"
        : p.stock_status === "empty"
          ? "sin_stock"
          : "bajo_objetivo",
  }));
}

// Productos con estado desconocido: no se decide automáticamente que faltan.
export function computeStockReview(
  products: (ProductLike & { notes?: string | null })[],
): StockReviewItem[] {
  return products
    .filter(
      (p) => p.stock_status === "unknown" && p.purchase_now_quantity == null,
    )
    .map((p) => ({
      product_id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      stock_status: p.stock_status,
      stock_minimum: p.stock_minimum,
      stock_target: p.stock_target,
      notes: p.notes ?? null,
    }));
}
