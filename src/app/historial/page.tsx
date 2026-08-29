"use client";

// Historial de movimientos de inventario.

import { useEffect, useState } from "react";
import { listMovements } from "@/lib/services/inventoryService";
import { MOVEMENT_LABEL, fmtDate, fmtQty } from "@/lib/format";
import type { InventoryMovement } from "@/lib/types";

const SIGN: Record<string, string> = {
  purchase: "+",
  manual_adjustment: "+",
  consumption: "−",
  waste: "−",
  expiration: "−",
  correction: "→",
};

export default function HistorialPage() {
  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMovements(100)
      .then(setMovements)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Historial 🕐</h1>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!movements ? (
        <p className="text-sm text-neutral-400">Cargando…</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no hay movimientos. Registrá un consumo o una compra.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border-b border-neutral-100 p-3 last:border-b-0"
            >
              <div>
                <div className="text-sm font-semibold">{m.products?.name ?? "—"}</div>
                <div className="text-xs text-neutral-400">
                  {MOVEMENT_LABEL[m.movement_type]} · {fmtDate(m.created_at)}
                  {m.notes ? ` · ${m.notes}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">
                  {m.movement_type === "correction"
                    ? `→ ${fmtQty(m.new_stock)}`
                    : `${SIGN[m.movement_type]}${fmtQty(m.quantity)}`}
                </div>
                <div className="text-xs text-neutral-400">
                  {fmtQty(m.previous_stock)} → {fmtQty(m.new_stock)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
