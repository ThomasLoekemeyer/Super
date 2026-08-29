-- Verificación: la lista inicial de reposición debe derivarse sola del seed.
-- Ejecutar tras aplicar las migrations. Debe devolver una única fila con ok = true.
--
-- Lista esperada (según los datos reales cargados el 2026-08-29):
--   Pasta de dientes, Shampoo, Máquinas de afeitar descartables, Toallitas,
--   Cinta bifaz, Huevos (6), Queso rallado, Queso fresco, Leche (3),
--   Coca-Cola (3), Sprite (3), Lomito, Zanahoria, Polvo para hornear,
--   Pasta seca (3), Arroz común, Tomate en lata (2),
--   Detergente para lavavajillas, Abrillantador para lavavajillas.

with expected (name, buy_quantity) as (
  values
    ('Pasta de dientes', null::numeric),
    ('Shampoo', null),
    ('Máquinas de afeitar descartables', null),
    ('Toallitas', null),
    ('Cinta bifaz', null),
    ('Huevos', 6),
    ('Queso rallado', null),
    ('Queso fresco', null),
    ('Leche', 3),
    ('Coca-Cola', 3),
    ('Sprite', 3),
    ('Lomito', null),
    ('Zanahoria', null),
    ('Polvo para hornear', null),
    ('Pasta seca', 3),
    ('Arroz común', null),
    ('Tomate en lata', 2),
    ('Detergente para lavavajillas', null),
    ('Abrillantador para lavavajillas', null)
),
actual as (
  select name, buy_quantity from public.replenishment_suggestions
),
missing as (
  select e.name from expected e
  left join actual a on a.name = e.name and a.buy_quantity is not distinct from e.buy_quantity
  where a.name is null
),
extra as (
  select a.name from actual a
  left join expected e on e.name = a.name
  where e.name is null
)
select
  (select count(*) from actual) as total_actual,
  (select count(*) from expected) as total_esperado,
  coalesce((select array_agg(name) from missing), '{}') as faltan_o_difieren,
  coalesce((select array_agg(name) from extra), '{}') as sobran,
  ((select count(*) from missing) = 0 and (select count(*) from extra) = 0) as ok;
