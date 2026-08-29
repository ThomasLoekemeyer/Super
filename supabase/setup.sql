-- ============================================================
-- SETUP COMPLETO — Super · Inventario Hogar
-- ============================================================
-- Pegá TODO este archivo en el SQL Editor de tu proyecto de
-- Supabase (Dashboard → SQL Editor → New query → Run).
-- Crea el schema completo y carga el inventario real inicial.
-- Es la concatenación de supabase/migrations/*.sql.
--
-- Después verificá con supabase/tests/verify_replenishment.sql
-- (debe devolver ok = true) y cargá URL + publishable key en .env.local.
-- ============================================================

-- ============================================================
-- Super - Inventario Hogar: schema inicial
-- ============================================================

-- Enums -------------------------------------------------------

create type public.stock_status as enum (
  'known',                      -- conozco cantidad exacta
  'available_unknown_quantity', -- sé que tengo pero no sé cuánto
  'empty',                      -- sé que no tengo
  'unknown'                     -- no sé el estado
);

create type public.movement_type as enum (
  'purchase',
  'consumption',
  'manual_adjustment',
  'waste',
  'expiration',
  'correction'
);

create type public.shopping_list_status as enum (
  'draft',
  'generated',
  'cart_prepared',
  'ordered',
  'received',
  'cancelled'
);

-- Tablas ------------------------------------------------------

create table public.products (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid,
  name                  text not null,
  category              text not null,
  subcategory           text,
  brand_preference      text,
  unit                  text not null default 'unidad',
  stock_quantity        numeric,              -- NULL = cantidad desconocida
  stock_status          public.stock_status not null default 'unknown',
  stock_minimum         numeric,              -- NULL = sin mínimo definido
  stock_target          numeric,              -- NULL = objetivo aún no definido (editable)
  stock_target_max      numeric,              -- para rangos (reservado)
  purchase_now_quantity numeric,              -- pedido explícito de compra ("comprar ahora N")
  is_recurring          boolean not null default false,
  needs_purchase        boolean not null default false,
  allow_substitution    boolean not null default true,
  estimated_price       numeric,              -- precio unitario estimado (para "valor estimado")
  aliases               text[] not null default '{}',  -- para el parser de lenguaje natural
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint products_name_unique unique (name),
  constraint stock_known_requires_quantity
    check (stock_status <> 'known' or stock_quantity is not null),
  constraint stock_empty_is_zero
    check (stock_status <> 'empty' or coalesce(stock_quantity, 0) = 0)
);

create table public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  user_id        uuid,
  movement_type  public.movement_type not null,
  quantity       numeric,             -- cantidad del movimiento (positiva)
  unit           text,
  previous_stock numeric,             -- NULL si era desconocido
  new_stock      numeric,             -- NULL si sigue desconocido
  notes          text,
  created_at     timestamptz not null default now()
);

create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

create table public.shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  name        text not null default 'Compra',
  status      public.shopping_list_status not null default 'draft',
  supermarket text,
  notes       text,
  ordered_at  timestamptz,
  received_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.shopping_list_items (
  id               uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  product_name     text not null,     -- snapshot por si el producto se borra
  quantity         numeric,           -- NULL = "comprar, cantidad a criterio"
  unit             text,
  checked          boolean not null default false,
  estimated_price  numeric,
  notes            text,
  created_at       timestamptz not null default now()
);

create index shopping_list_items_list_idx on public.shopping_list_items (shopping_list_id);

create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  name         text not null,
  servings     numeric not null default 2,
  notes        text,
  times_cooked integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint recipes_name_unique unique (name)
);

create table public.recipe_ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name       text not null,
  quantity   numeric,        -- por el total de "servings" de la receta
  unit       text,
  optional   boolean not null default false,
  created_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- updated_at automático --------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger shopping_lists_set_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ============================================================
-- Motor de reposición (NO hardcodea productos: deriva del stock)
-- ============================================================
-- Reglas:
--  1. purchase_now_quantity definido -> comprar esa cantidad (pedido explícito).
--  2. empty + (habitual o marcado "necesita compra") -> comprar.
--     Cantidad = stock_target si está definido; NULL si no (comprar "a criterio").
--  3. known + stock_target definido y stock_quantity < COALESCE(stock_minimum, stock_target)
--     -> comprar stock_target - stock_quantity.
--     (Con mínimo definido, ej. cerveza 12/15: solo se repone al caer bajo el mínimo,
--      y se repone hasta el objetivo.)
--  4. Cantidad desconocida (unknown / available_unknown_quantity) SIN pedido explícito
--     -> NUNCA entra a la lista de compra; va a "stock a revisar" (vista aparte).

create or replace view public.replenishment_suggestions
with (security_invoker = true) as
select
  p.id as product_id,
  p.name,
  p.category,
  p.unit,
  p.brand_preference,
  p.stock_quantity,
  p.stock_status,
  p.stock_minimum,
  p.stock_target,
  p.estimated_price,
  case
    when p.purchase_now_quantity is not null
      then p.purchase_now_quantity
    when p.stock_status = 'empty' and p.stock_target is not null
      then greatest(p.stock_target - coalesce(p.stock_quantity, 0), 0)
    when p.stock_status = 'known' and p.stock_target is not null
         and p.stock_quantity < coalesce(p.stock_minimum, p.stock_target)
      then greatest(p.stock_target - p.stock_quantity, 0)
    else null
  end as buy_quantity,
  (p.purchase_now_quantity is not null) as is_explicit_request,
  case
    when p.purchase_now_quantity is not null then 'pedido_explicito'
    when p.stock_status = 'empty' then 'sin_stock'
    else 'bajo_objetivo'
  end as reason
from public.products p
where
  p.purchase_now_quantity is not null
  or (p.stock_status = 'empty' and (p.is_recurring or p.needs_purchase))
  or (
    p.stock_status = 'known'
    and p.stock_target is not null
    and p.stock_quantity < coalesce(p.stock_minimum, p.stock_target)
  );

-- Productos con estado desconocido: no se decide automáticamente que faltan.
create or replace view public.stock_review
with (security_invoker = true) as
select
  p.id as product_id,
  p.name,
  p.category,
  p.unit,
  p.stock_status,
  p.stock_minimum,
  p.stock_target,
  p.notes
from public.products p
where p.stock_status = 'unknown'
  and p.purchase_now_quantity is null;

-- ============================================================
-- Funciones de dominio (atómicas, sin SQL generado por IA)
-- ============================================================

-- Registra un movimiento y actualiza el stock del producto de forma consistente.
--  * consumption / waste / expiration: descuenta p_quantity (si el stock es conocido).
--  * purchase / manual_adjustment: suma p_quantity y el stock pasa a conocido.
--  * correction: fija el stock en p_set_to (cantidad absoluta, "quedan N").
create or replace function public.register_movement(
  p_product_id uuid,
  p_type public.movement_type,
  p_quantity numeric default null,
  p_set_to numeric default null,
  p_notes text default null
)
returns public.products
language plpgsql
set search_path = ''
as $$
declare
  v_product public.products;
  v_prev numeric;
  v_new numeric;
  v_new_status public.stock_status;
  v_move_qty numeric;
begin
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto % no encontrado', p_product_id;
  end if;

  v_prev := v_product.stock_quantity;

  if p_type = 'correction' then
    if p_set_to is null then
      raise exception 'correction requiere p_set_to (cantidad absoluta)';
    end if;
    v_new := greatest(p_set_to, 0);
    v_move_qty := abs(v_new - coalesce(v_prev, v_new));
  elsif p_type in ('consumption', 'waste', 'expiration') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception '% requiere una cantidad positiva', p_type;
    end if;
    v_move_qty := p_quantity;
    if v_prev is null then
      v_new := null; -- stock desconocido: se registra el consumo sin inventar cantidad
    else
      v_new := greatest(v_prev - p_quantity, 0);
    end if;
  elsif p_type in ('purchase', 'manual_adjustment') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception '% requiere una cantidad positiva', p_type;
    end if;
    v_move_qty := p_quantity;
    v_new := coalesce(v_prev, 0) + p_quantity;
  else
    raise exception 'Tipo de movimiento no soportado: %', p_type;
  end if;

  if v_new is null then
    v_new_status := v_product.stock_status; -- sigue desconocido
  elsif v_new = 0 then
    v_new_status := 'empty';
  else
    v_new_status := 'known';
  end if;

  insert into public.inventory_movements
    (product_id, user_id, movement_type, quantity, unit, previous_stock, new_stock, notes)
  values
    (p_product_id, v_product.user_id, p_type, v_move_qty, v_product.unit, v_prev, v_new, p_notes);

  update public.products
  set stock_quantity = v_new,
      stock_status = v_new_status,
      needs_purchase = case
        when v_new is null then needs_purchase
        when v_new = 0 then true
        when stock_target is not null
          then v_new < coalesce(stock_minimum, stock_target)
        else false
      end,
      -- una compra satisface el pedido explícito de "comprar ahora"
      purchase_now_quantity = case
        when p_type = 'purchase' then null
        else purchase_now_quantity
      end
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

-- Genera una lista de compra a partir de las sugerencias actuales de reposición.
create or replace function public.generate_shopping_list(p_name text default 'Compra')
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_list_id uuid;
begin
  insert into public.shopping_lists (name, status)
  values (p_name, 'generated')
  returning id into v_list_id;

  insert into public.shopping_list_items
    (shopping_list_id, product_id, product_name, quantity, unit, estimated_price)
  select v_list_id, s.product_id, s.name, s.buy_quantity, s.unit, s.estimated_price
  from public.replenishment_suggestions s
  order by s.category, s.name;

  return v_list_id;
end;
$$;

-- Marca una lista como recibida: crea un movimiento de compra por cada ítem
-- con producto y cantidad, y recién ahí aumenta el stock.
create or replace function public.receive_shopping_list(p_list_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status public.shopping_list_status;
  v_item record;
begin
  select status into v_status from public.shopping_lists where id = p_list_id for update;
  if not found then
    raise exception 'Lista % no encontrada', p_list_id;
  end if;
  if v_status = 'received' then
    raise exception 'La lista ya fue recibida';
  end if;
  if v_status = 'cancelled' then
    raise exception 'La lista está cancelada';
  end if;

  for v_item in
    select * from public.shopping_list_items
    where shopping_list_id = p_list_id
      and product_id is not null
      and quantity is not null
      and quantity > 0
  loop
    perform public.register_movement(
      v_item.product_id,
      'purchase',
      v_item.quantity,
      null,
      'Recepción de lista de compra'
    );
  end loop;

  update public.shopping_lists
  set status = 'received', received_at = now()
  where id = p_list_id;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
-- App de uso personal/doméstico (single-household, sin login por ahora):
-- RLS habilitado con políticas abiertas para anon/authenticated.
-- Para endurecer más adelante: agregar auth y cambiar las políticas a
-- user_id = auth.uid().

alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "household full access" on public.products
  for all using (true) with check (true);
create policy "household full access" on public.inventory_movements
  for all using (true) with check (true);
create policy "household full access" on public.shopping_lists
  for all using (true) with check (true);
create policy "household full access" on public.shopping_list_items
  for all using (true) with check (true);
create policy "household full access" on public.recipes
  for all using (true) with check (true);
create policy "household full access" on public.recipe_ingredients
  for all using (true) with check (true);

-- ============================================================
-- SEED: datos reales iniciales
-- ============================================================

-- ============================================================
-- SEED: inventario real inicial de la casa (datos provistos por
-- el usuario el 2026-08-29). NO se inventan cantidades: si el
-- usuario no dio un número, stock_quantity queda NULL; si no
-- definió objetivo, stock_target queda NULL (editable en la app).
-- ============================================================

insert into public.products
  (name, category, subcategory, brand_preference, unit,
   stock_quantity, stock_status, stock_minimum, stock_target,
   purchase_now_quantity, is_recurring, needs_purchase, aliases, notes)
values
-- ---------- BAÑO PRINCIPAL / HIGIENE ----------
('Pasta de dientes', 'Higiene', 'Baño principal', null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['pasta dental','dentifrico'], null),

('Shampoo', 'Higiene', 'Baño principal', null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['champu'], null),

('Crema de enjuague / acondicionador', 'Higiene', 'Baño principal', null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['crema de enjuague','acondicionador'], 'Cantidad exacta desconocida'),

('Desodorante', 'Higiene', 'Baño principal', null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array[]::text[], null),

('Hilo dental', 'Higiene', 'Baño principal', null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array[]::text[], null),

('Jabón líquido', 'Higiene', 'Baño principal', null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['jabon'], null),

('Papel higiénico', 'Higiene', 'Baño principal', null, 'rollo',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['papel'], 'Hay stock, cantidad exacta desconocida'),

('Máquinas de afeitar descartables', 'Higiene', 'Baño principal', 'Gillette', 'unidad',
 0, 'empty', null, null, null, true, true,
 array['gillette','maquinas de afeitar','afeitadoras'], null),

('Toallitas', 'Higiene', 'Baño principal', null, 'paquete',
 0, 'empty', null, null, null, true, true,
 array[]::text[], null),

-- ---------- SEGUNDO BAÑO / LAVADERO / STOCK ----------
('Balde', 'Lavadero', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], 'No es producto de reposición frecuente'),

('Trapo rejilla', 'Lavadero', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array['rejilla'], null),

('Líquido para lavar ropa', 'Lavadero', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['jabon para ropa','detergente para ropa'], null),

('Suavizante para ropa', 'Lavadero', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['suavizante'], null),

-- ---------- PRODUCTOS PARA LA CASA ----------
('Cinta bifaz', 'Hogar', null, '3M', 'unidad',
 0, 'empty', null, null, null, false, true,
 array['cinta doble faz'], 'Quiere una buena, preferentemente tipo 3M'),

-- ---------- FREEZER / CARNES ----------
('Carne', 'Freezer', 'Carnes', null, 'kg',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['carne vacuna'], null),

('Pollo', 'Freezer', 'Carnes', null, 'kg',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array[]::text[], null),

('Milanesas', 'Freezer', 'Carnes', null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['milanesa','milas'], null),

-- ---------- HELADERA ----------
('Huevos', 'Heladera', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, 6, true, true,
 array['huevo'], 'Tengo pocos. Comprar 6 ahora. Stock objetivo a definir (editable).'),

('Queso rallado', 'Heladera', null, null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array[]::text[], null),

('Queso fresco', 'Heladera', null, null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['queso'], null),

('Leche', 'Heladera', null, null, 'unidad',
 0, 'empty', null, 3, null, true, true,
 array['leches'], null),

('Coca-Cola', 'Heladera', 'Bebidas', null, 'unidad',
 1, 'known', null, 4, null, true, true,
 array['coca','cocas','coca cola'], null),

('Sprite', 'Heladera', 'Bebidas', null, 'unidad',
 1, 'known', null, 4, null, true, true,
 array['sprites'], null),

('Mayonesa', 'Heladera', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['mayo'], null),

('Salsa barbacoa', 'Heladera', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['barbacoa','bbq'], null),

('Mermelada', 'Heladera', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array[]::text[], null),

('Postrecito Ser', 'Heladera', null, 'Ser', 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['postrecito','postrecitos'], null),

('Yogur', 'Heladera', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['yogurt','yogures'], null),

('Tapas de empanadas', 'Heladera', null, null, 'paquete',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['tapas empanadas'], null),

('Jamón', 'Heladera', 'Fiambres', null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array[]::text[], null),

('Lomito', 'Heladera', 'Fiambres', null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['fiambre lomito'], null),

-- ---------- VERDURAS Y FRUTAS ----------
('Morrón', 'Verduras y frutas', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['morrones'], null),

('Naranja', 'Verduras y frutas', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['naranjas'], null),

('Zanahoria', 'Verduras y frutas', null, null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['zanahorias'], null),

('Zapallito', 'Verduras y frutas', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['zapallitos'], null),

('Tomates cherry', 'Verduras y frutas', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['cherry','tomate cherry'], null),

-- ---------- CERVEZA ----------
-- Rango deseado: mínimo 12, objetivo 15. Cantidad actual NO especificada.
-- Regla: si el stock (cuando se conozca) baja de 12, comprar 15 - actual.
('Cerveza', 'Bebidas', null, null, 'unidad',
 null, 'unknown', 12, 15, null, true, false,
 array['birra','birras','cervezas'],
 'Mantener entre 12 y 15. Cantidad actual sin especificar: revisar stock.'),

-- ---------- ALACENA ----------
('Té', 'Alacena', null, null, 'caja',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array['te'], null),

('Miel', 'Alacena', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], null),

('Galletitas', 'Alacena', null, null, 'paquete',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], null),

('Harina', 'Alacena', null, null, 'kg',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], null),

('Semillas de chía', 'Alacena', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array['chia','semillas de chia'], null),

('Variedades de té', 'Alacena', null, null, 'caja',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array['otros tes'], 'Otro tipo de té / variedades'),

('Azúcar', 'Alacena', null, null, 'kg',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array['azucar'], null),

('Pan rallado', 'Alacena', null, null, 'unidad',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], null),

('Galletitas de arroz', 'Alacena', null, null, 'paquete',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], null),

('Galletitas dulces', 'Alacena', null, null, 'paquete',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array[]::text[], null),

('Pasta seca', 'Alacena', null, null, 'paquete',
 0, 'empty', 2, 3, null, true, true,
 array['fideos','pasta'], 'Mantener entre 2 y 3 paquetes'),

('Arroz común', 'Alacena', null, null, 'paquete',
 0, 'empty', null, null, null, true, true,
 array['arroz comun','arroz'], 'Stock objetivo todavía no definido'),

('Arroz para sushi', 'Alacena', null, null, 'paquete',
 null, 'available_unknown_quantity', null, null, null, false, false,
 array['arroz sushi'], 'Tengo mucho, cantidad exacta desconocida'),

('Arroz Carnaroli', 'Alacena', null, null, 'paquete',
 null, 'available_unknown_quantity', null, null, null, true, false,
 array['carnaroli'], null),

('Polvo para hornear', 'Alacena', null, null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['polvo de hornear','levadura quimica'], null),

-- ---------- LATAS ----------
('Tomate en lata', 'Latas', null, null, 'lata',
 3, 'known', null, 5, null, true, true,
 array['tomate lata','lata de tomate','tomates en lata'], null),

('Choclo en lata', 'Latas', null, null, 'lata',
 2, 'known', null, null, null, true, false,
 array['choclo','lata de choclo'], 'Stock objetivo todavía no especificado'),

('Atún en lata', 'Latas', null, null, 'lata',
 3, 'known', null, null, null, true, false,
 array['atun','lata de atun'], 'Stock objetivo todavía no especificado. Hoy no necesita compra.'),

-- ---------- ACEITES ----------
('Aceite de oliva', 'Aceites', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['oliva'], null),

('Aceite común', 'Aceites', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['aceite','aceite comun'], null),

-- ---------- BEBIDAS / DESAYUNO ----------
('Agua', 'Bebidas', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['aguas'], null),

('Cápsulas de café', 'Desayuno', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['capsulas','cafe','capsulas de cafe'], null),

('Yerba', 'Desayuno', null, null, 'paquete',
 null, 'unknown', null, null, null, true, false,
 array['yerba mate'], null),

-- ---------- MASCOTAS ----------
('Comida para gato', 'Mascotas', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['comida gato','alimento para gato'], null),

-- ---------- LAVAVAJILLAS ----------
('Detergente para lavavajillas', 'Lavavajillas', null, null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['polvo lavavajillas','detergente lavavajillas','polvo para lavavajillas'], null),

('Abrillantador para lavavajillas', 'Lavavajillas', null, null, 'unidad',
 0, 'empty', null, null, null, true, true,
 array['abrillantador'], null),

-- ---------- LIMPIEZA ----------
('CIF', 'Limpieza', null, 'CIF', 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['cif crema'], null),

('Antigrasa', 'Limpieza', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array[]::text[], null),

('Limpiavidrios', 'Limpieza', null, null, 'unidad',
 null, 'unknown', null, null, null, true, false,
 array['limpia vidrios'], null);
