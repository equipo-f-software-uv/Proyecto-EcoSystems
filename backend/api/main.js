const express = require('express');
const mysql = require('mysql2/promise');
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
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'tu_password',
    database: 'ecosystems_db',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
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
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        // Parseo simple de ISO 8601 a DATETIME de MySQL
        const fechaHora = payload.timestamp.replace("T", " ").replace("Z", "");

        const valores = [payload.sensor_id, payload.protocol, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fechaHora];
        
        // Usamos el pool para realizar el insert de forma eficiente
        await pool.execute(query, valores);

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
                DATE_FORMAT(fecha_hora, '%Y-%m-%d') as date,
                SUM(flujo_agua_lpm) as water,
                AVG(humedad_suelo_prc) as humidity
            FROM medicion_historica
            WHERE fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(fecha_hora)
            ORDER BY date ASC
        `;
        const [rows] = await pool.query(query);
        
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