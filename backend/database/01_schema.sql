-- =================================================================
-- Script de Inicialización de Base de Datos - EcoSystems
-- Motor recomendado: MySQL / PostgreSQL
-- =================================================================

-- (Opcional) Creación de la base de datos si no existe
CREATE DATABASE IF NOT EXISTS ecosystems_db;
USE ecosystems_db;

-- 1. Tabla Maestra: Registro de Nodos (Dispositivos en terreno)
CREATE TABLE IF NOT EXISTS nodo_sensor (
    id_nodo VARCHAR(50) PRIMARY KEY,
    ubicacion VARCHAR(100) NOT NULL,
    estado_activo BOOLEAN DEFAULT TRUE,
    fecha_instalacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Configuración: Perfiles de Cultivo (Ref: Issue #4)
CREATE TABLE IF NOT EXISTS perfil_cultivo (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cultivo VARCHAR(50) NOT NULL,
    humedad_min_prc INT NOT NULL, -- Umbral mínimo para encender riego
    humedad_max_prc INT NOT NULL  -- Umbral máximo para apagar riego
);

-- 3. Tabla Transaccional: Historial de Mediciones
CREATE TABLE IF NOT EXISTS medicion_historica (
    id_medicion INT AUTO_INCREMENT PRIMARY KEY,
    id_nodo VARCHAR(50) NOT NULL,
    humedad_suelo_prc DECIMAL(5,2) NOT NULL,
    temperatura_c DECIMAL(5,2) NOT NULL,
    flujo_agua_lpm DECIMAL(5,2) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_nodo) REFERENCES nodo_sensor(id_nodo) ON DELETE CASCADE
);

-- 4. Tabla de Auditoría: Registro de Válvulas (Ref: Issue #5)
CREATE TABLE IF NOT EXISTS registro_valvula (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    id_nodo VARCHAR(50) NOT NULL,
    accion VARCHAR(20) NOT NULL,  -- Valores esperados: 'ABRIR' o 'CERRAR'
    motivo VARCHAR(100) NOT NULL, -- Ej: 'Automático - Umbral bajo' o 'Manual'
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_nodo) REFERENCES nodo_sensor(id_nodo) ON DELETE CASCADE
);

-- =================================================================
-- Fin del script
-- =================================================================