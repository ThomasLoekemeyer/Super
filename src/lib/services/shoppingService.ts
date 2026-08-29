// ShoppingService: lista de reposición automática y ciclo de vida de compras.
// Una compra NO aumenta stock hasta marcarse como "received"
// (la RPC receive_shopping_list crea los movimientos individuales).

import { getSupabase } from "../supabase";
import type {
  ReplenishmentSuggestion,
  ShoppingList,
  ShoppingListItem,
  ShoppingListStatus,
  StockReviewItem,
} from "../types";

/** Lista de reposición calculada en vivo por la vista SQL. */
export async function getSuggestions(): Promise<ReplenishmentSuggestion[]> {
  const { data, error } = await getSupabase()
    .from("replenishment_suggestions")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw error;
  return data as ReplenishmentSuggestion[];
}

/** Productos con estado desconocido: "stock a revisar". */
export async function getStockReview(): Promise<StockReviewItem[]> {
  const { data, error } = await getSupabase()
    .from("stock_review")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw error;
  return data as StockReviewItem[];
}

/** Congela las sugerencias actuales en una lista de compra (status generated). */
export async function generateList(name = "Compra"): Promise<string> {
  const { data, error } = await getSupabase().rpc("generate_shopping_list", {
    p_name: name,
  });
  if (error) throw error;
  return data as string;
}

export async function listShoppingLists(limit = 10): Promise<ShoppingList[]> {
  const { data, error } = await getSupabase()
    .from("shopping_lists")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ShoppingList[];
}

export async function getListItems(listId: string): Promise<ShoppingListItem[]> {
  const { data, error } = await getSupabase()
    .from("shopping_list_items")
    .select("*")
    .eq("shopping_list_id", listId)
    .order("product_name");
  if (error) throw error;
  return data as ShoppingListItem[];
}

export async function setListStatus(
  listId: string,
  status: Exclude<ShoppingListStatus, "received">,
): Promise<void> {
  const { error } = await getSupabase()
    .from("shopping_lists")
    .update({ status, ordered_at: status === "ordered" ? new Date().toISOString() : undefined })
    .eq("id", listId);
  if (error) throw error;
}

/** Recepción: crea movimientos purchase por ítem y recién ahí sube el stock. */
export async function receiveList(listId: string): Promise<void> {
  const { error } = await getSupabase().rpc("receive_shopping_list", {
    p_list_id: listId,
  });
  if (error) throw error;
}

export async function updateItem(
  itemId: string,
  patch: Partial<Pick<ShoppingListItem, "quantity" | "checked" | "notes">>,
): Promise<void> {
  const { error } = await getSupabase()
    .from("shopping_list_items")
    .update(patch)
    .eq("id", itemId);
  if (error) throw error;
}
