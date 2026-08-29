// InventoryService: única puerta de entrada a cambios de stock.
// Todas las mutaciones pasan por la función SQL register_movement (RPC),
// que registra el movimiento y actualiza el producto de forma atómica.

import { getSupabase } from "../supabase";
import type { InventoryMovement, MovementType, Product } from "../types";

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from("products")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw error;
  return data as Product[];
}

async function rpcMovement(params: {
  product_id: string;
  type: MovementType;
  quantity?: number;
  setTo?: number;
  notes?: string;
}): Promise<Product> {
  const { data, error } = await getSupabase().rpc("register_movement", {
    p_product_id: params.product_id,
    p_type: params.type,
    p_quantity: params.quantity ?? null,
    p_set_to: params.setTo ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) throw error;
  return data as Product;
}

/** "Gasté 2 cocas" */
export function consume(productId: string, quantity: number, notes?: string) {
  return rpcMovement({ product_id: productId, type: "consumption", quantity, notes });
}

/** "Compré 6 huevos" (compra directa, fuera de una lista) */
export function purchase(productId: string, quantity: number, notes?: string) {
  return rpcMovement({ product_id: productId, type: "purchase", quantity, notes });
}

/** "Quedan 2 huevos" -> corrección absoluta */
export function setStock(productId: string, quantity: number, notes?: string) {
  return rpcMovement({ product_id: productId, type: "correction", setTo: quantity, notes });
}

/** "No queda leche" */
export function deplete(productId: string, notes?: string) {
  return rpcMovement({ product_id: productId, type: "correction", setTo: 0, notes });
}

export function registerWaste(productId: string, quantity: number, notes?: string) {
  return rpcMovement({ product_id: productId, type: "waste", quantity, notes });
}

export async function updateProduct(
  productId: string,
  patch: Partial<
    Pick<
      Product,
      | "name"
      | "category"
      | "subcategory"
      | "brand_preference"
      | "unit"
      | "stock_minimum"
      | "stock_target"
      | "stock_target_max"
      | "purchase_now_quantity"
      | "is_recurring"
      | "needs_purchase"
      | "allow_substitution"
      | "estimated_price"
      | "notes"
    >
  >,
): Promise<Product> {
  const { data, error } = await getSupabase()
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function listMovements(limit = 30): Promise<InventoryMovement[]> {
  const { data, error } = await getSupabase()
    .from("inventory_movements")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as InventoryMovement[];
}
