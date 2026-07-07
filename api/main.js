const { createApp } = require('./shared/createApp');
const { pool } = require('./shared/db');

const app = createApp();

const PORT = process.env.PORT || 8000;

// =================================================================
// 2. ENDPOINTS (Rutas)
// =================================================================

app.get('/', (req, res) => {
    res.json({ status: "ok", message: "API de EcoSystems en línea" });
});

app.post('/api/mediciones', async (req, res) => {
    /*
      Recibe el JSON desde el Arduino, lo valida y lo inserta en MySQL.
    */
    const payload = req.body;

    // Validación del Payload (similar a lo que hacía Pydantic)
    if (!payload || !payload.sensor_id || !payload.protocol || !payload.timestamp || !payload.metrics) {
        return res.status(400).json({ detail: "Faltan datos en el payload" });
    }

    const { humedad_suelo_prc, temperatura_c, flujo_agua_lpm } = payload.metrics;

    if (humedad_suelo_prc === undefined || temperatura_c === undefined || flujo_agua_lpm === undefined) {
        return res.status(400).json({ detail: "Métricas incompletas en el payload" });
    }

    try {
        // Consulta SQL preparada para evitar inyecciones SQL
        const query = `
            INSERT INTO medicion_historica 
            (id_nodo, protocolo, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fecha_hora) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

        // PostgreSQL procesa el formato ISO 8601 nativamente
        const fechaHora = payload.timestamp;

        const valores = [payload.sensor_id, payload.protocol, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fechaHora];
        
        // Usamos el pool para realizar el insert de forma eficiente
        await pool.query(query, valores);

        // Retornamos éxito al Arduino
        return res.json({ status: "success", message: "Datos guardados correctamente" });
    } catch (error) {
        console.error("Error BD:", error);
        return res.status(500).json({ detail: `Error al insertar en BD: ${error.message}` });
    }
});

// =================================================================
app.listen(PORT, () => {
    console.log(`Servidor de EcoSystems corriendo en el puerto ${PORT}`);
});