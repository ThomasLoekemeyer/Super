// Fixture espejo del seed SQL (20260829000002_seed_household_data.sql).
// Solo los campos que usa el motor de reposición.

import type { Product } from "../src/lib/types";

type SeedRow = Pick<
  Product,
  | "name"
  | "stock_quantity"
  | "stock_status"
  | "stock_minimum"
  | "stock_target"
  | "purchase_now_quantity"
  | "is_recurring"
  | "needs_purchase"
>;

const row = (
  name: string,
  stock_quantity: number | null,
  stock_status: Product["stock_status"],
  opts: Partial<SeedRow> = {},
): SeedRow => ({
  name,
  stock_quantity,
  stock_status,
  stock_minimum: null,
  stock_target: null,
  purchase_now_quantity: null,
  is_recurring: false,
  needs_purchase: false,
  ...opts,
});

export const SEED_PRODUCTS: SeedRow[] = [
  // Higiene
  row("Pasta de dientes", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Shampoo", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Crema de enjuague / acondicionador", null, "available_unknown_quantity", { is_recurring: true }),
  row("Desodorante", null, "unknown", { is_recurring: true }),
  row("Hilo dental", null, "unknown", { is_recurring: true }),
  row("Jabón líquido", null, "unknown", { is_recurring: true }),
  row("Papel higiénico", null, "available_unknown_quantity", { is_recurring: true }),
  row("Máquinas de afeitar descartables", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Toallitas", 0, "empty", { is_recurring: true, needs_purchase: true }),
  // Lavadero
  row("Balde", null, "available_unknown_quantity"),
  row("Trapo rejilla", null, "available_unknown_quantity"),
  row("Líquido para lavar ropa", null, "available_unknown_quantity", { is_recurring: true }),
  row("Suavizante para ropa", null, "available_unknown_quantity", { is_recurring: true }),
  // Hogar
  row("Cinta bifaz", 0, "empty", { needs_purchase: true }),
  // Freezer
  row("Carne", null, "available_unknown_quantity", { is_recurring: true }),
  row("Pollo", null, "available_unknown_quantity", { is_recurring: true }),
  row("Milanesas", null, "available_unknown_quantity", { is_recurring: true }),
  // Heladera
  row("Huevos", null, "available_unknown_quantity", {
    is_recurring: true,
    needs_purchase: true,
    purchase_now_quantity: 6,
  }),
  row("Queso rallado", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Queso fresco", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Leche", 0, "empty", { is_recurring: true, needs_purchase: true, stock_target: 3 }),
  row("Coca-Cola", 1, "known", { is_recurring: true, needs_purchase: true, stock_target: 4 }),
  row("Sprite", 1, "known", { is_recurring: true, needs_purchase: true, stock_target: 4 }),
  row("Mayonesa", null, "available_unknown_quantity", { is_recurring: true }),
  row("Salsa barbacoa", null, "available_unknown_quantity", { is_recurring: true }),
  row("Mermelada", null, "available_unknown_quantity", { is_recurring: true }),
  row("Postrecito Ser", null, "available_unknown_quantity", { is_recurring: true }),
  row("Yogur", null, "available_unknown_quantity", { is_recurring: true }),
  row("Tapas de empanadas", null, "available_unknown_quantity", { is_recurring: true }),
  row("Jamón", null, "available_unknown_quantity", { is_recurring: true }),
  row("Lomito", 0, "empty", { is_recurring: true, needs_purchase: true }),
  // Verduras y frutas
  row("Morrón", null, "available_unknown_quantity", { is_recurring: true }),
  row("Naranja", null, "available_unknown_quantity", { is_recurring: true }),
  row("Zanahoria", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Zapallito", null, "available_unknown_quantity", { is_recurring: true }),
  row("Tomates cherry", null, "available_unknown_quantity", { is_recurring: true }),
  // Cerveza (rango 12-15, cantidad actual sin especificar)
  row("Cerveza", null, "unknown", { is_recurring: true, stock_minimum: 12, stock_target: 15 }),
  // Alacena
  row("Té", null, "available_unknown_quantity"),
  row("Miel", null, "available_unknown_quantity"),
  row("Galletitas", null, "available_unknown_quantity"),
  row("Harina", null, "available_unknown_quantity"),
  row("Semillas de chía", null, "available_unknown_quantity"),
  row("Variedades de té", null, "available_unknown_quantity"),
  row("Azúcar", null, "available_unknown_quantity"),
  row("Pan rallado", null, "available_unknown_quantity"),
  row("Galletitas de arroz", null, "available_unknown_quantity"),
  row("Galletitas dulces", null, "available_unknown_quantity"),
  row("Pasta seca", 0, "empty", {
    is_recurring: true,
    needs_purchase: true,
    stock_minimum: 2,
    stock_target: 3,
  }),
  row("Arroz común", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Arroz para sushi", null, "available_unknown_quantity"),
  row("Arroz Carnaroli", null, "available_unknown_quantity", { is_recurring: true }),
  row("Polvo para hornear", 0, "empty", { is_recurring: true, needs_purchase: true }),
  // Latas
  row("Tomate en lata", 3, "known", { is_recurring: true, needs_purchase: true, stock_target: 5 }),
  row("Choclo en lata", 2, "known", { is_recurring: true }),
  row("Atún en lata", 3, "known", { is_recurring: true }),
  // Aceites
  row("Aceite de oliva", null, "unknown", { is_recurring: true }),
  row("Aceite común", null, "unknown", { is_recurring: true }),
  // Bebidas / desayuno
  row("Agua", null, "unknown", { is_recurring: true }),
  row("Cápsulas de café", null, "unknown", { is_recurring: true }),
  row("Yerba", null, "unknown", { is_recurring: true }),
  // Mascotas
  row("Comida para gato", null, "unknown", { is_recurring: true }),
  // Lavavajillas
  row("Detergente para lavavajillas", 0, "empty", { is_recurring: true, needs_purchase: true }),
  row("Abrillantador para lavavajillas", 0, "empty", { is_recurring: true, needs_purchase: true }),
  // Limpieza
  row("CIF", null, "unknown", { is_recurring: true }),
  row("Antigrasa", null, "unknown", { is_recurring: true }),
  row("Limpiavidrios", null, "unknown", { is_recurring: true }),
];

export function asProducts(): Parameters<
  typeof import("../src/lib/replenishment").computeSuggestions
>[0] {
  return SEED_PRODUCTS.map((r, i) => ({
    id: `seed-${i}`,
    category: "test",
    unit: "unidad",
    brand_preference: null,
    estimated_price: null,
    ...r,
  }));
}
