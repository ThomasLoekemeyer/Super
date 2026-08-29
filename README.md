# Super 🏠 — Inventario doméstico y reposición automática

App web mobile-first (PWA instalable) para mantener el inventario de casa,
registrar consumos en lenguaje natural y saber automáticamente qué comprar.

**Stack:** Next.js 15 · TypeScript · Supabase (PostgreSQL) · Tailwind CSS 4 · Vitest

## Conectar tu Supabase (una sola vez)

La app se conecta al proyecto de Supabase que vos elijas (cualquier cuenta,
sirve el free tier):

1. Creá un proyecto en [supabase.com](https://supabase.com/dashboard).
2. En el **SQL Editor** del proyecto, pegá y ejecutá **`supabase/setup.sql`**
   (un solo archivo: crea el schema completo y carga el inventario real inicial).
3. Verificá pegando `supabase/tests/verify_replenishment.sql`: debe devolver
   `ok = true` con los 19 productos de la lista inicial.
4. Copiá `.env.example` a `.env.local` y completá con la **Project URL** y la
   **publishable key** de tu proyecto (Project Settings → API Keys).

Alternativa con CLI: `supabase link --project-ref TU_REF && supabase db push`
(usa las migrations de `supabase/migrations/`).

## Arranque

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 24 tests: parser + motor de reposición contra el seed real
```

## Pantallas

| Ruta | Qué hace |
|---|---|
| `/` | Dashboard: STOCK BAJO · PRÓXIMA COMPRA · VALOR ESTIMADO · ÚLTIMOS CONSUMOS |
| `/registrar` | Texto libre ("Gasté 2 cocas", "Quedan 2 huevos", "Hice pollo con arroz") + consumo rápido de 1 tap |
| `/compra` | Lista de reposición automática, "stock a revisar", ciclo de vida de listas |
| `/inventario` | Todo el catálogo por categoría, +/− rápido, edición de stock/mínimo/objetivo |
| `/historial` | Movimientos de inventario |

## Modelo de datos (Supabase)

- `products` — catálogo con `stock_quantity` (NULL = desconocida), `stock_status`
  (`known` / `available_unknown_quantity` / `empty` / `unknown`), `stock_minimum`,
  `stock_target` (NULL = objetivo aún no definido, editable), `purchase_now_quantity`
  (pedido explícito tipo "comprar 6 huevos ahora"), `is_recurring`, `needs_purchase`,
  `brand_preference`, `aliases` (para el parser), etc.
- `inventory_movements` — historial (`purchase`, `consumption`, `manual_adjustment`,
  `waste`, `expiration`, `correction`) con stock previo/nuevo.
- `shopping_lists` + `shopping_list_items` — estados `draft → generated →
  cart_prepared → ordered → received / cancelled`. **El stock solo sube al marcar
  la lista como recibida** (la RPC `receive_shopping_list` crea un movimiento por ítem).
- `recipes` + `recipe_ingredients` — comidas reutilizables.

### Motor de reposición

Vive en la vista SQL `replenishment_suggestions` (y su espejo puro testeable en
`src/lib/replenishment.ts`). Nada está hardcodeado; las reglas son:

1. `purchase_now_quantity` definido → comprar esa cantidad (pedido explícito).
2. `empty` + (habitual o "necesita compra") → comprar. Cantidad = `stock_target`
   si está definido, si no "a criterio".
3. `known` + objetivo definido y `stock < COALESCE(stock_minimum, stock_target)`
   → comprar `MAX(stock_target − stock, 0)`. Con mínimo definido (cerveza 12/15)
   solo se repone al caer bajo el mínimo, y se repone hasta el objetivo.
4. Cantidad desconocida sin pedido explícito → **nunca** entra a la lista;
   aparece en la vista `stock_review` ("Stock a revisar").

Verificación en la base: `supabase/tests/verify_replenishment.sql` (devuelve
`ok = true` si la lista derivada coincide con la esperada según los datos
iniciales). También corre en `npm test` contra un fixture espejo del seed.

## Lenguaje natural

Parser determinístico y desacoplado (`src/lib/nlp/parser.ts`): convierte el texto
en una acción estructurada (`{action, productQuery, quantity}`), el resolver
(`resolver.ts`) matchea contra nombre + aliases, la UI muestra un **preview** y
recién al confirmar se llama a `InventoryService` → RPC `register_movement`.
**Nunca se genera SQL desde texto.** Para frases más complejas se puede enchufar
un LLM reemplazando solo el parser: el contrato `ParsedAction` no cambia.

Comidas: "Hice milanesas con puré" busca una receta guardada; si no existe, se
arman los ingredientes una vez (con preview antes de descontar) y se puede
guardar como receta.

## Supermercados (etapa 2)

`src/lib/providers/SupermarketProvider.ts` define la interfaz
(`searchProduct`, `getPrice`, `getAvailability`, `getProductDetails`,
`buildCart`, `getCartUrl`) y un registry. Coto/Carrefour/Jumbo/Día/Disco/Vea/
Rappi no tienen API pública de checkout, por eso precios, disponibilidad,
matching, carrito y checkout están separados: cada capa se implementa con lo
que exista (deep links, carga asistida, etc.).

## PWA / iPhone

Manifest + service worker + íconos incluidos. En Safari: **Compartir →
Agregar a inicio**. Deploy sugerido: Vercel (importar el repo y cargar
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como variables
de entorno del proyecto).

## Seguridad (decisión consciente)

RLS está habilitado con políticas abiertas (`using (true)`): es una app
doméstica single-household sin login. Quien tenga la URL del proyecto y la
publishable key puede leer/escribir el inventario. Para endurecer: activar
Supabase Auth y cambiar las políticas a `user_id = auth.uid()`.
