const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 8003;
const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'tu_password',
    database: process.env.DB_NAME || 'ecosystems_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432')
};
const pool = new Pool(DB_CONFIG);

async function logSystemError(tipo, mensaje, detalle = null, nodoId = null) {
    try {
        const query = `
            INSERT INTO registro_error_sistema (tipo_error, mensaje_error, detalle_tecnico, nodo_id)
            VALUES ($1, $2, $3, $4)
        `;
        await pool.query(query, [tipo, mensaje, detalle, nodoId]);
        console.log(`[LOG-ERROR] ${tipo}: ${mensaje}`);
    } catch (e) {
        console.error("Error crítico: No se pudo guardar el log en la BD:", e.message);
    }
}

app.get('/api/perfiles', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM perfil_cultivo ORDER BY id_perfil ASC");
        res.json(rows);
    } catch (e) {
        await logSystemError('CODIGO', 'Error al listar perfiles de cultivo', e.stack);
        res.status(500).json({ detail: e.message });
    }
});

/**
 * US-04: Creación de un nuevo perfil (Happy Path)
 * Endpoint: POST /api/crop-profiles
 */
app.post('/api/crop-profiles', async (req, res) => {
    const { cropName, minHumidity, maxHumidity } = req.body;

    // Escenario 2: Validación de datos incorrectos
    if (!cropName || minHumidity === undefined || maxHumidity === undefined || minHumidity === null || maxHumidity === null) {
        return res.status(400).json({ error: "MISSING_FIELDS", message: "Todos los campos son obligatorios." });
    }

    if (!Number.isInteger(minHumidity) || !Number.isInteger(maxHumidity)) {
        return res.status(400).json({ error: "INVALID_TYPE", message: "La humedad mínima y máxima deben ser números enteros." });
    }

    if (minHumidity < 0 || maxHumidity < 0 || minHumidity > 100 || maxHumidity > 100) {
        return res.status(400).json({ error: "INVALID_RANGE", message: "La humedad debe estar entre 0 y 100." });
    }

    if (minHumidity >= maxHumidity) {
        return res.status(400).json({ 
            error: "MIN_GREATER_THAN_MAX", 
            message: "La humedad mínima debe ser menor que la máxima." 
        });
    }

    try {
        // Escenario 3: Control de perfiles duplicados
        const checkQuery = "SELECT id_perfil FROM perfil_cultivo WHERE nombre_cultivo = $1";
        const checkRes = await pool.query(checkQuery, [cropName]);
        if (checkRes.rowCount > 0) {
            return res.status(409).json({ 
                error: "PROFILE_ALREADY_EXISTS", 
                message: `Ya existe un perfil con el nombre '${cropName}'.` 
            });
        }

        const query = `
            INSERT INTO perfil_cultivo (nombre_cultivo, humedad_min_prc, humedad_max_prc)
            VALUES ($1, $2, $3) RETURNING id_perfil
        `;
        const { rows } = await pool.query(query, [cropName, minHumidity, maxHumidity]);
        
        // Escenario 1: Happy Path (201 Created)
        res.status(201).json({ 
            id_perfil: rows[0].id_perfil, 
            cropName, 
            minHumidity, 
            maxHumidity 
        });
    } catch (e) {
        await logSystemError('CODIGO', 'Error al crear perfil de cultivo', e.stack);
        res.status(500).json({ detail: e.message });
    }
});

/**
 * US-04: Asignación de perfil a un sector de riego
 * Endpoint: PUT /api/sectors/:sectorId/profile
 */
app.put('/api/sectors/:sectorId/profile', async (req, res) => {
    const { sectorId } = req.params;
    const { profileId } = req.body;

    if (!profileId) {
        return res.status(400).json({ error: "MISSING_PROFILE_ID", message: "El profileId es obligatorio." });
    }

    try {
        // Verificar existencia del perfil
        const checkProfile = await pool.query("SELECT id_perfil FROM perfil_cultivo WHERE id_perfil = $1", [profileId]);
        if (checkProfile.rowCount === 0) {
            return res.status(404).json({ error: "PROFILE_NOT_FOUND", message: "El perfil especificado no existe." });
        }

        // Verificar existencia del sector (nodo_sensor)
        const checkSector = await pool.query("SELECT id_nodo FROM nodo_sensor WHERE id_nodo = $1", [sectorId]);
        if (checkSector.rowCount === 0) {
            return res.status(404).json({ error: "SECTOR_NOT_FOUND", message: "El sector (nodo) especificado no existe." });
        }

        // Escenario 4: Asignación exitosa
        const query = "UPDATE nodo_sensor SET id_perfil = $1 WHERE id_nodo = $2";
        await pool.query(query, [profileId, sectorId]);

        res.json({ 
            status: "success", 
            message: `Perfil ${profileId} asignado al sector ${sectorId} exitosamente.` 
        });
    } catch (e) {
        await logSystemError('CODIGO', 'Error al asignar perfil a sector', e.stack);
        res.status(500).json({ detail: e.message });
    }
});

/**
 * US-03: Configuración y validación de umbrales.
 * Endpoint: PUT /api/irrigation/thresholds
 */
app.put('/api/irrigation/thresholds', async (req, res) => {
    const { id_perfil, humedad_min_prc, humedad_max_prc } = req.body;

    // Escenario 3: Validación de umbrales
    if (id_perfil === undefined || humedad_min_prc === undefined || humedad_max_prc === undefined) {
        return res.status(400).json({ error: "Campos faltantes: id_perfil, humedad_min_prc y humedad_max_prc son obligatorios." });
    }

    if (humedad_min_prc < 0 || humedad_max_prc < 0 || humedad_min_prc > 100 || humedad_max_prc > 100) {
        return res.status(400).json({ error: "Los umbrales deben estar entre 0 y 100." });
    }

    if (humedad_min_prc >= humedad_max_prc) {
        return res.status(400).json({ error: "Datos inconsistentes: el umbral mínimo debe ser menor al umbral máximo." });
    }

    try {
        const query = `
            UPDATE perfil_cultivo 
            SET humedad_min_prc = $1, humedad_max_prc = $2 
            WHERE id_perfil = $3
            RETURNING *
        `;
        const { rows, rowCount } = await pool.query(query, [humedad_min_prc, humedad_max_prc, id_perfil]);
        
        if (rowCount === 0) return res.status(404).json({ error: "Perfil de cultivo no encontrado." });
        
        res.json({ status: "success", data: rows[0] });
    } catch (e) {
        await logSystemError('CODIGO', 'Error al actualizar umbrales de riego', e.stack);
        res.status(500).json({ detail: e.message });
    }
});

app.delete('/api/perfiles/:id_perfil', async (req, res) => {
    const id_perfil = parseInt(req.params.id_perfil);
    try {
        const query = "DELETE FROM perfil_cultivo WHERE id_perfil = $1";
        const { rowCount } = await pool.query(query, [id_perfil]);
        
        if (rowCount === 0) return res.status(404).json({ detail: "Perfil no encontrado" });
        
        res.json({ status: "success", message: `Perfil ${id_perfil} eliminado` });
    } catch (e) {
        await logSystemError('CODIGO', 'Error al eliminar perfil de cultivo', e.stack);
        res.status(500).json({ detail: e.message });
    }
});

app.listen(PORT, () => console.log(`API Perfiles corriendo en puerto ${PORT}`));