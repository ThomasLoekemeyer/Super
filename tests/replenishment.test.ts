import { describe, expect, it } from "vitest";
import {
  buyQuantityFor,
  computeStockReview,
  computeSuggestions,
} from "../src/lib/replenishment";
import { asProducts } from "./seedFixture";

// Lista inicial esperada según los DATOS REALES del usuario. El test valida
// que las REGLAS la deriven del inventario (la app nunca hardcodea la lista).
const EXPECTED_INITIAL_LIST: Record<string, number | null> = {
  "Pasta de dientes": null,
  Shampoo: null,
  "Máquinas de afeitar descartables": null,
  Toallitas: null,
  "Cinta bifaz": null,
  Huevos: 6,
  "Queso rallado": null,
  "Queso fresco": null,
  Leche: 3,
  "Coca-Cola": 3,
  Sprite: 3,
  Lomito: null,
  Zanahoria: null,
  "Polvo para hornear": null,
  "Pasta seca": 3,
  "Arroz común": null,
  "Tomate en lata": 2,
  "Detergente para lavavajillas": null,
  "Abrillantador para lavavajillas": null,
};

describe("motor de reposición con el seed real", () => {
  const products = asProducts();
  const suggestions = computeSuggestions(products);

  it("genera exactamente la lista inicial esperada", () => {
    const got = Object.fromEntries(suggestions.map((s) => [s.name, s.buy_quantity]));
    expect(got).toEqual(EXPECTED_INITIAL_LIST);
  });

  it("no incluye productos con cantidad desconocida sin pedido explícito", () => {
    const names = suggestions.map((s) => s.name);
    expect(names).not.toContain("Cerveza");
    expect(names).not.toContain("Mayonesa");
    expect(names).not.toContain("Papel higiénico");
    expect(names).not.toContain("Desodorante");
  });

  it("no incluye productos known sin objetivo definido (choclo, atún)", () => {
    const names = suggestions.map((s) => s.name);
    expect(names).not.toContain("Choclo en lata");
    expect(names).not.toContain("Atún en lata");
  });

  it("los huevos entran como pedido explícito de 6 sin inventar objetivo", () => {
    const huevos = suggestions.find((s) => s.name === "Huevos")!;
    expect(huevos.buy_quantity).toBe(6);
    expect(huevos.is_explicit_request).toBe(true);
    expect(huevos.stock_target).toBeNull();
  });

  it("cerveza y demás estados desconocidos aparecen en 'stock a revisar'", () => {
    const review = computeStockReview(products).map((r) => r.name);
    expect(review).toContain("Cerveza");
    expect(review).toContain("Yerba");
    expect(review).toContain("Comida para gato");
    // available_unknown_quantity no es "a revisar": sé que tengo.
    expect(review).not.toContain("Mayonesa");
  });
});

describe("fórmula de compra", () => {
  const base = {
    id: "x",
    name: "X",
    category: "t",
    unit: "unidad",
    brand_preference: null,
    estimated_price: null,
    stock_minimum: null,
    stock_target: null,
    purchase_now_quantity: null,
    is_recurring: true,
    needs_purchase: false,
  };

  it("buy = MAX(objetivo - actual, 0)", () => {
    expect(
      buyQuantityFor({ ...base, stock_quantity: 1, stock_status: "known", stock_target: 4 }),
    ).toBe(3);
    expect(
      buyQuantityFor({ ...base, stock_quantity: 5, stock_status: "known", stock_target: 4 }),
    ).toBeNull(); // por encima del objetivo: no se sugiere
  });

  it("rango cerveza: >= mínimo no compra; < mínimo repone hasta objetivo", () => {
    const beer = { ...base, stock_minimum: 12, stock_target: 15 };
    expect(buyQuantityFor({ ...beer, stock_quantity: 12, stock_status: "known" })).toBeNull();
    expect(buyQuantityFor({ ...beer, stock_quantity: 14, stock_status: "known" })).toBeNull();
    expect(buyQuantityFor({ ...beer, stock_quantity: 8, stock_status: "known" })).toBe(7);
  });

  it("empty con objetivo compra el objetivo completo", () => {
    expect(
      buyQuantityFor({ ...base, stock_quantity: 0, stock_status: "empty", stock_target: 3 }),
    ).toBe(3);
  });
});
