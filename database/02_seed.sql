-- =================================================================
-- Script de Datos Semilla para EcoSystems
-- Pre-carga perfiles de cultivo, nodos de sensores y válvulas
-- =================================================================

-- 1. Insertar perfiles de cultivo
INSERT INTO perfil_cultivo (id_perfil, nombre_cultivo, humedad_min_prc, humedad_max_prc) VALUES
(1, 'Palto', 55, 75),
(2, 'Tomate', 60, 80),
(3, 'Maíz', 40, 65)
ON CONFLICT (id_perfil) DO NOTHING;

-- Sincronizar secuencia de perfiles
SELECT setval(pg_get_serial_sequence('perfil_cultivo', 'id_perfil'), COALESCE(MAX(id_perfil), 1)) FROM perfil_cultivo;

-- 2. Insertar nodos de sensores
INSERT INTO nodo_sensor (id_nodo, id_perfil, ubicacion, estado_activo) VALUES
('nodo_huerto_01', 1, 'Zona Norte', true),
('NODO_VALPO_01', 2, 'Zona Sur', true),
('nodo_huerto_03', 3, 'Zona Este', true),
('nodo_huerto_04', 3, 'Zona Oeste', true),
('nodo_huerto_05', 2, 'Invernadero 1', true),
('nodo_huerto_06', 2, 'Invernadero 2', true)
ON CONFLICT (id_nodo) DO NOTHING;

-- 3. Insertar válvulas de control asociadas a los sensores
INSERT INTO valvula_control (id_valvula, id_nodo, nombre_valvula, estado_actual, ubicacion_especifica, modo_operacion, bloqueo_manual) VALUES
(1, 'nodo_huerto_01', 'Válvula Zona Norte', 'CERRADA', 'Sector A1', 'AUTOMATIC', false),
(2, 'NODO_VALPO_01', 'Válvula Zona Sur', 'CERRADA', 'Sector B2', 'AUTOMATIC', false),
(3, 'nodo_huerto_03', 'Válvula Zona Este', 'CERRADA', 'Sector C3', 'AUTOMATIC', false),
(4, 'nodo_huerto_04', 'Válvula Zona Oeste', 'CERRADA', 'Sector D4', 'AUTOMATIC', false),
(5, 'nodo_huerto_05', 'Válvula Invernadero 1', 'CERRADA', 'Invernadero A', 'AUTOMATIC', false),
(6, 'nodo_huerto_06', 'Válvula Invernadero 2', 'CERRADA', 'Invernadero B', 'AUTOMATIC', false)
ON CONFLICT (id_valvula) DO NOTHING;

-- Sincronizar secuencia de válvulas
SELECT setval(pg_get_serial_sequence('valvula_control', 'id_valvula'), COALESCE(MAX(id_valvula), 1)) FROM valvula_control;

-- 4. Insertar mediciones históricas iniciales para que los gráficos del dashboard no estén vacíos al iniciar la demo
INSERT INTO medicion_historica (id_nodo, protocolo, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fecha_hora)
VALUES 
('nodo_huerto_01', 'v1-api', 45.0, 22.5, 0.0, NOW() - INTERVAL '6 days'),
('nodo_huerto_01', 'v1-api', 48.0, 21.8, 12.5, NOW() - INTERVAL '5 days'),
('nodo_huerto_01', 'v1-api', 52.0, 20.4, 15.0, NOW() - INTERVAL '4 days'),
('nodo_huerto_01', 'v1-api', 58.0, 23.1, 0.0, NOW() - INTERVAL '3 days'),
('nodo_huerto_01', 'v1-api', 50.0, 24.2, 10.0, NOW() - INTERVAL '2 days'),
('nodo_huerto_01', 'v1-api', 46.0, 25.0, 11.2, NOW() - INTERVAL '1 day'),
('nodo_huerto_01', 'v1-api', 44.0, 24.8, 8.5, NOW() - INTERVAL '12 hours'),

('NODO_VALPO_01', 'v1-api', 62.0, 18.5, 0.0, NOW() - INTERVAL '6 days'),
('NODO_VALPO_01', 'v1-api', 64.0, 19.2, 5.0, NOW() - INTERVAL '5 days'),
('NODO_VALPO_01', 'v1-api', 67.0, 18.0, 6.2, NOW() - INTERVAL '4 days'),
('NODO_VALPO_01', 'v1-api', 63.0, 17.5, 0.0, NOW() - INTERVAL '3 days'),
('NODO_VALPO_01', 'v1-api', 61.0, 18.9, 8.0, NOW() - INTERVAL '2 days'),
('NODO_VALPO_01', 'v1-api', 59.0, 19.4, 9.5, NOW() - INTERVAL '1 day'),
('NODO_VALPO_01', 'v1-api', 58.0, 19.0, 4.0, NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;
