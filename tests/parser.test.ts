import { describe, expect, it } from "vitest";
import { parseInput } from "../src/lib/nlp/parser";
import { resolveProduct } from "../src/lib/nlp/resolver";
import type { Product } from "../src/lib/types";

describe("parser de lenguaje natural", () => {
  it("gasté 2 Coca-Cola -> consume 2", () => {
    expect(parseInput("Gasté 2 Coca-Cola")).toEqual({
      action: "consume",
      productQuery: "coca-cola",
      quantity: 2,
    });
  });

  it("gasté 2 cocas -> consume 2", () => {
    expect(parseInput("Gasté 2 cocas")).toEqual({
      action: "consume",
      productQuery: "cocas",
      quantity: 2,
    });
  });

  it("usé una leche -> consume 1", () => {
    expect(parseInput("Usé una leche")).toEqual({
      action: "consume",
      productQuery: "leche",
      quantity: 1,
    });
  });

  it("tomé una Sprite -> consume 1", () => {
    expect(parseInput("Tomé una Sprite")).toEqual({
      action: "consume",
      productQuery: "sprite",
      quantity: 1,
    });
  });

  it("quedan 2 huevos -> set_stock 2", () => {
    expect(parseInput("Quedan 2 huevos")).toEqual({
      action: "set_stock",
      productQuery: "huevos",
      quantity: 2,
    });
  });

  it("compré 6 huevos -> purchase 6", () => {
    expect(parseInput("Compré 6 huevos")).toEqual({
      action: "purchase",
      productQuery: "huevos",
      quantity: 6,
    });
  });

  it("no queda leche -> deplete", () => {
    expect(parseInput("No queda leche")).toEqual({
      action: "deplete",
      productQuery: "leche",
    });
  });

  it("se acabó el shampoo -> deplete", () => {
    expect(parseInput("Se acabó el shampoo")).toEqual({
      action: "deplete",
      productQuery: "shampoo",
    });
  });

  it("hice pollo con arroz -> meal", () => {
    expect(parseInput("Hice pollo con arroz")).toEqual({
      action: "meal",
      description: "pollo con arroz",
    });
  });

  it("texto sin sentido -> unknown", () => {
    expect(parseInput("asdf qwerty").action).toBe("unknown");
  });
});

const mkProduct = (name: string, aliases: string[] = []): Product =>
  ({
    id: name,
    name,
    aliases,
  }) as unknown as Product;

describe("resolución de productos", () => {
  const catalog = [
    mkProduct("Coca-Cola", ["coca", "cocas", "coca cola"]),
    mkProduct("Sprite", ["sprites"]),
    mkProduct("Leche", ["leches"]),
    mkProduct("Huevos", ["huevo"]),
    mkProduct("Cerveza", ["birra", "birras"]),
    mkProduct("Arroz común", ["arroz", "arroz comun"]),
    mkProduct("Arroz para sushi", ["arroz sushi"]),
  ];

  it("matchea por alias (cocas -> Coca-Cola)", () => {
    expect(resolveProduct("cocas", catalog).match?.name).toBe("Coca-Cola");
  });

  it("matchea singular/plural (huevos -> Huevos)", () => {
    expect(resolveProduct("huevos", catalog).match?.name).toBe("Huevos");
  });

  it("matchea por nombre exacto normalizado", () => {
    expect(resolveProduct("leche", catalog).match?.name).toBe("Leche");
  });

  it("birra -> Cerveza", () => {
    expect(resolveProduct("birra", catalog).match?.name).toBe("Cerveza");
  });

  it("'arroz' resuelve al alias exacto aunque haya variantes", () => {
    expect(resolveProduct("arroz", catalog).match?.name).toBe("Arroz común");
  });

  it("sin match devuelve candidatos vacíos", () => {
    expect(resolveProduct("xyz", catalog)).toEqual({ match: null, candidates: [] });
  });
});
