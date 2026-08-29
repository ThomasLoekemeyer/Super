// Tipos de dominio alineados con el schema de Supabase.

export type StockStatus =
  | "known"
  | "available_unknown_quantity"
  | "empty"
  | "unknown";

export type MovementType =
  | "purchase"
  | "consumption"
  | "manual_adjustment"
  | "waste"
  | "expiration"
  | "correction";

export type ShoppingListStatus =
  | "draft"
  | "generated"
  | "cart_prepared"
  | "ordered"
  | "received"
  | "cancelled";

export interface Product {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  subcategory: string | null;
  brand_preference: string | null;
  unit: string;
  stock_quantity: number | null;
  stock_status: StockStatus;
  stock_minimum: number | null;
  stock_target: number | null;
  stock_target_max: number | null;
  purchase_now_quantity: number | null;
  is_recurring: boolean;
  needs_purchase: boolean;
  allow_substitution: boolean;
  estimated_price: number | null;
  aliases: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  user_id: string | null;
  movement_type: MovementType;
  quantity: number | null;
  unit: string | null;
  previous_stock: number | null;
  new_stock: number | null;
  notes: string | null;
  created_at: string;
  products?: { name: string } | null;
}

export interface ShoppingList {
  id: string;
  user_id: string | null;
  name: string;
  status: ShoppingListStatus;
  supermarket: string | null;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  estimated_price: number | null;
  notes: string | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string | null;
  name: string;
  servings: number;
  notes: string | null;
  times_cooked: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  product_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  created_at: string;
}

export interface ReplenishmentSuggestion {
  product_id: string;
  name: string;
  category: string;
  unit: string;
  brand_preference: string | null;
  stock_quantity: number | null;
  stock_status: StockStatus;
  stock_minimum: number | null;
  stock_target: number | null;
  estimated_price: number | null;
  buy_quantity: number | null;
  is_explicit_request: boolean;
  reason: "pedido_explicito" | "sin_stock" | "bajo_objetivo";
}

export interface StockReviewItem {
  product_id: string;
  name: string;
  category: string;
  unit: string;
  stock_status: StockStatus;
  stock_minimum: number | null;
  stock_target: number | null;
  notes: string | null;
}
