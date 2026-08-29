import type { StockStatus } from "./types";

export function fmtQty(q: number | null | undefined): string {
  if (q == null) return "?";
  return Number.isInteger(q) ? String(q) : q.toFixed(1).replace(".", ",");
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  known: "Cantidad conocida",
  available_unknown_quantity: "Hay, cantidad sin confirmar",
  empty: "Sin stock",
  unknown: "Estado desconocido",
};

export const STATUS_BADGE: Record<StockStatus, string> = {
  known: "bg-emerald-100 text-emerald-800",
  available_unknown_quantity: "bg-sky-100 text-sky-800",
  empty: "bg-red-100 text-red-700",
  unknown: "bg-amber-100 text-amber-800",
};

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const MOVEMENT_LABEL: Record<string, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  manual_adjustment: "Ajuste",
  waste: "Desperdicio",
  expiration: "Vencido",
  correction: "Corrección",
};

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
