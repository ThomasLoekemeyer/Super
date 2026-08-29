// Resuelve el texto del producto ("cocas", "leche") contra el catálogo real,
// usando nombre normalizado, aliases y singular/plural. Si hay ambigüedad,
// devuelve candidatos para que la UI pregunte.

import { normalize } from "./parser";
import type { Product } from "../types";

export interface ResolutionResult {
  match: Product | null;
  candidates: Product[];
}

function singularize(word: string): string {
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function variants(text: string): string[] {
  const n = normalize(text);
  const sing = n.split(" ").map(singularize).join(" ");
  return Array.from(new Set([n, sing]));
}

function score(product: Product, query: string): number {
  const queryVariants = variants(query);
  const nameVariants = variants(product.name);
  const aliasVariants = product.aliases.flatMap((a) => variants(a));

  for (const q of queryVariants) {
    if (nameVariants.includes(q) || aliasVariants.includes(q)) return 100;
  }
  for (const q of queryVariants) {
    for (const nv of [...nameVariants, ...aliasVariants]) {
      if (nv.startsWith(q) || q.startsWith(nv)) return 60;
    }
  }
  for (const q of queryVariants) {
    for (const nv of [...nameVariants, ...aliasVariants]) {
      if (nv.includes(q) || q.includes(nv)) return 40;
    }
  }
  return 0;
}

export function resolveProduct(
  query: string,
  products: Product[],
): ResolutionResult {
  const scored = products
    .map((p) => ({ p, s: score(p, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (scored.length === 0) return { match: null, candidates: [] };

  const top = scored[0];
  const ties = scored.filter((x) => x.s === top.s);

  if (top.s >= 60 && ties.length === 1) {
    return { match: top.p, candidates: scored.slice(0, 5).map((x) => x.p) };
  }
  return { match: null, candidates: scored.slice(0, 5).map((x) => x.p) };
}
