const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
// Middleware para parsear el body como JSON
app.use(express.json());
// Habilitar CORS para permitir peticiones desde el Frontend (React)
app.use(cors());

const PORT = process.env.PORT || 8000;

// =================================================================
// 1. CONFIGURACIÓN DE BASE DE DATOS (Pool de conexiones)
// =================================================================
// Usamos un pool para manejar mejor las peticiones concurrentes (Requisito US-10)
const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'tu_password',
    database: 'ecosystems_db',
    port: 5432,
    max: 100
});

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
// 3. ENDPOINT DE ESTADÍSTICAS (US-13: Visualización de históricos)
// =================================================================
app.get('/api/estadisticas', async (req, res) => {
    try {
        const query = `
            SELECT 
                TO_CHAR(fecha_hora, 'YYYY-MM-DD') as date,
                SUM(flujo_agua_lpm) as water,
                AVG(humedad_suelo_prc) as humidity
            FROM medicion_historica
            WHERE fecha_hora >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY TO_CHAR(fecha_hora, 'YYYY-MM-DD')
            ORDER BY date ASC
        `;
        const { rows } = await pool.query(query);
        
        res.json({ status: "success", data: rows });
    } catch (error) {
        console.error("Error BD Estadísticas:", error);
        res.status(500).json({ detail: `Error al consultar históricos: ${error.message}` });
    }
});

// =================================================================
app.listen(PORT, () => {
    console.log(`Servidor de EcoSystems corriendo en el puerto ${PORT}`);
});