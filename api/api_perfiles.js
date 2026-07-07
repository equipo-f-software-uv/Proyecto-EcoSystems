const { createApp } = require('./shared/createApp');
const { pool } = require('./shared/db');
const { validateHumidityRange } = require('./shared/validation');

const app = createApp();

const PORT = process.env.PORT || 8003;

app.get('/api/perfiles', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM perfil_cultivo ORDER BY id_perfil ASC");
        res.json(rows);
    } catch (e) {
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

    const rangeError = validateHumidityRange(minHumidity, maxHumidity);
    if (rangeError) {
        return res.status(400).json({ error: "INVALID_RANGE", message: rangeError });
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

    const rangeError = validateHumidityRange(humedad_min_prc, humedad_max_prc);
    if (rangeError) {
        return res.status(400).json({ error: rangeError });
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
        res.status(500).json({ detail: e.message });
    }
});

app.listen(PORT, () => console.log(`API Perfiles corriendo en puerto ${PORT}`));