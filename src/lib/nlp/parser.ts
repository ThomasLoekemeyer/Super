// Parser de lenguaje natural (español rioplatense) para el registro rápido.
//
// DESACOPLADO Y DETERMINÍSTICO: convierte texto libre en una acción
// estructurada. Nunca genera SQL. El flujo completo es:
//
//   texto -> parseInput() -> resolveProduct() -> preview en UI
//         -> confirmación -> InventoryService -> RPC register_movement -> Supabase
//
// Si mañana se quiere usar un LLM para frases más complejas, se reemplaza
// solo este módulo: el contrato de salida (ParsedAction) no cambia.

export type ParsedAction =
  | { action: "consume"; productQuery: string; quantity: number }
  | { action: "purchase"; productQuery: string; quantity: number }
  | { action: "set_stock"; productQuery: string; quantity: number }
  | { action: "deplete"; productQuery: string } // "no queda X" -> stock 0
  | { action: "meal"; description: string } // "hice pollo con arroz"
  | { action: "unknown"; text: string };

/** Normaliza: minúsculas, sin tildes, espacios colapsados. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s.,/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, docena: 12,
  media: 0.5, medio: 0.5, quince: 15, veinte: 20,
};

function parseQuantity(token: string | undefined): number | null {
  if (!token) return null;
  const t = token.trim();
  if (/^\d+([.,]\d+)?$/.test(t)) return parseFloat(t.replace(",", "."));
  return NUMBER_WORDS[t] ?? null;
}

/** Saca artículos/preposiciones iniciales del nombre de producto. */
function cleanProductQuery(raw: string): string {
  return raw
    .replace(/^(?:de\s+|del\s+|la\s+|el\s+|los\s+|las\s+|un\s+|una\s+|unos\s+|unas\s+)+/,
      "")
    .replace(/\s+(?:mas|más)$/, "")
    .trim();
}

const QTY = "(\\d+(?:[.,]\\d+)?|" + Object.keys(NUMBER_WORDS).join("|") + ")";

const CONSUME_VERBS =
  "gaste|gastamos|use|usamos|tome|tomamos|comi|comimos|consumi|consumimos|termine|terminamos|abri|abrimos";
const PURCHASE_VERBS = "compre|compramos|traje|trajimos|llegaron|llego";
const SET_VERBS = "quedan|queda|hay|tengo|tenemos";
const MEAL_VERBS = "hice|hicimos|cocine|cocinamos|prepare|preparamos|cene|almorce";

interface Rule {
  re: RegExp;
  build: (m: RegExpMatchArray) => ParsedAction | null;
}

const RULES: Rule[] = [
  // "se acabó X" / "se terminó X" / "no queda X" / "no hay X" / "no tengo X"
  {
    re: new RegExp(
      "^(?:se (?:acabo|acabaron|termino|terminaron)|no (?:queda|quedan|hay|tengo|tenemos))\\s+(?:mas\\s+)?(.+)$",
    ),
    build: (m) => ({ action: "deplete", productQuery: cleanProductQuery(m[1]) }),
  },
  // "quedan 2 huevos" / "hay 3 latas de tomate" / "tengo 5 cervezas"
  {
    re: new RegExp(`^(?:${SET_VERBS})\\s+${QTY}\\s+(.+)$`),
    build: (m) => {
      const q = parseQuantity(m[1]);
      if (q == null) return null;
      return {
        action: "set_stock",
        productQuery: cleanProductQuery(m[2]),
        quantity: q,
      };
    },
  },
  // "compré 6 huevos" / "compré huevos"
  {
    re: new RegExp(`^(?:${PURCHASE_VERBS})\\s+(?:${QTY}\\s+)?(.+)$`),
    build: (m) => {
      const q = parseQuantity(m[1]) ?? 1;
      return {
        action: "purchase",
        productQuery: cleanProductQuery(m[2]),
        quantity: q,
      };
    },
  },
  // "hice pollo con arroz" / "cociné milanesas con puré para dos"
  {
    re: new RegExp(`^(?:${MEAL_VERBS})\\s+(.+)$`),
    build: (m) => ({ action: "meal", description: m[1].trim() }),
  },
  // "gasté 2 cocas" / "usé una leche" / "tomé una sprite"
  {
    re: new RegExp(`^(?:${CONSUME_VERBS})\\s+(?:${QTY}\\s+)?(.+)$`),
    build: (m) => {
      const q = parseQuantity(m[1]) ?? 1;
      return {
        action: "consume",
        productQuery: cleanProductQuery(m[2]),
        quantity: q,
      };
    },
  },
];

export function parseInput(text: string): ParsedAction {
  const n = normalize(text);
  if (!n) return { action: "unknown", text };
  for (const rule of RULES) {
    const m = n.match(rule.re);
    if (m) {
      const parsed = rule.build(m);
      if (parsed) return parsed;
    }
  }
  return { action: "unknown", text };
}
