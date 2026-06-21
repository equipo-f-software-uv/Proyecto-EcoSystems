-- =================================================================
-- Script de Inicialización de Base de Datos - EcoSystems
-- Motor recomendado: PostgreSQL + TimescaleDB (Arquitectura IoT)
-- =================================================================

-- Nota: En PostgreSQL, debes conectarte a la base de datos antes de ejecutar el resto
-- CREATE DATABASE ecosystems_db;
-- \c ecosystems_db

-- Habilitar la extensión de series de tiempo
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Tabla de Configuración: Perfiles de Cultivo (Ref: Issue #4 y US-04)
CREATE TABLE IF NOT EXISTS perfil_cultivo (
    id_perfil SERIAL PRIMARY KEY,
    nombre_cultivo VARCHAR(50) NOT NULL,
    humedad_min_prc INT NOT NULL, -- Umbral mínimo para encender riego
    humedad_max_prc INT NOT NULL  -- Umbral máximo para apagar riego
);

-- 2. Tabla Maestra: Registro de Nodos (Dispositivos en terreno)
CREATE TABLE IF NOT EXISTS nodo_sensor (
    id_nodo VARCHAR(50) PRIMARY KEY,
    id_perfil INT, -- Relación con el tipo de cultivo que monitorea
    ubicacion VARCHAR(100) NOT NULL,
    estado_activo BOOLEAN DEFAULT TRUE,
    fecha_instalacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_perfil) REFERENCES perfil_cultivo(id_perfil) ON DELETE SET NULL
);

-- 3. Tabla de Series de Tiempo: Historial de Mediciones
CREATE TABLE IF NOT EXISTS medicion_historica (
    id_medicion SERIAL,
    id_nodo VARCHAR(50) NOT NULL,
    protocolo VARCHAR(20) NOT NULL,
    humedad_suelo_prc DECIMAL(5,2) NOT NULL,
    temperatura_c DECIMAL(5,2) NOT NULL,
    flujo_agua_lpm DECIMAL(5,2) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL, -- Timestamp real enviado por el hardware
    fecha_recepcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp de llegada al servidor
    FOREIGN KEY (id_nodo) REFERENCES nodo_sensor(id_nodo) ON DELETE CASCADE,
    PRIMARY KEY (id_medicion, fecha_hora) -- Requisito de TimescaleDB para la partición
);

-- Convertir la tabla en una Hypertable optimizada para alta ingesta (IoT)
SELECT create_hypertable('medicion_historica', 'fecha_hora', if_not_exists => TRUE);

-- Índice compuesto para acelerar los gráficos del frontend por sensor (US-13)
CREATE INDEX idx_medicion_historica_nodo_fecha ON medicion_historica (id_nodo, fecha_hora DESC);

-- 4. Tabla de Actuadores: Control de Válvulas
CREATE TABLE IF NOT EXISTS valvula_control (
    id_valvula SERIAL PRIMARY KEY,
    id_nodo VARCHAR(50), -- Sensor asociado a la zona que riega esta válvula
    nombre_valvula VARCHAR(100) NOT NULL,
    estado_actual VARCHAR(20) DEFAULT 'CERRADA',
    ubicacion_especifica VARCHAR(100),
    modo_operacion VARCHAR(20) DEFAULT 'AUTOMATIC', -- 'AUTOMATIC' o 'MANUAL'
    bloqueo_manual BOOLEAN DEFAULT FALSE, -- True congela las decisiones automáticas
    FOREIGN KEY (id_nodo) REFERENCES nodo_sensor(id_nodo) ON DELETE SET NULL
);

-- 5. Tabla de Auditoría: Registro de Válvulas (Ref: Issue #5 y US-11)
CREATE TABLE IF NOT EXISTS registro_valvula (
    id_registro SERIAL PRIMARY KEY,
    id_valvula INT NOT NULL,
    accion VARCHAR(20) NOT NULL,  -- Valores esperados: 'ABRIR' o 'CERRAR'
    motivo VARCHAR(100) NOT NULL, -- Ej: 'Automático - Umbral bajo' o 'Manual'
    latencia_ms INT,              -- Para auditar el cumplimiento del límite < 100ms (REF-01)
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_valvula) REFERENCES valvula_control(id_valvula) ON DELETE CASCADE
);

-- 6. Tabla de Monitoreo: Registro de Errores del Sistema (US-06)
CREATE TABLE IF NOT EXISTS registro_error_sistema (
    id_error SERIAL PRIMARY KEY,
    tipo_error VARCHAR(50) NOT NULL, -- 'CODIGO', 'BASE_DATOS', 'HARDWARE', 'CONEXION'
    mensaje_error TEXT NOT NULL,
    detalle_tecnico TEXT,
    nodo_id VARCHAR(50), -- Opcional, para fallos de hardware
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Analítica: Recomendaciones de Riego (US-09)
CREATE TABLE IF NOT EXISTS recomendacion_riego (
    id_recomendacion SERIAL PRIMARY KEY,
    id_nodo VARCHAR(50) NOT NULL,
    accion_recomendada VARCHAR(50) NOT NULL,
    ajuste_agua_prc INT NOT NULL,
    motivo TEXT NOT NULL,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_nodo) REFERENCES nodo_sensor(id_nodo) ON DELETE CASCADE
);

-- 8. Tabla de Configuración Global del Sistema (Parada de Emergencia)
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id_config INT PRIMARY KEY DEFAULT 1,
    estado_global VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE' o 'SUSPENDED'
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (id_config = 1) -- Garantiza que sea un Singleton (solo una fila)
);

-- Insertar estado por defecto si no existe
INSERT INTO configuracion_sistema (id_config, estado_global) 
VALUES (1, 'ACTIVE') 
ON CONFLICT (id_config) DO NOTHING;

-- =================================================================
-- Fin del script
-- =================================================================