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
