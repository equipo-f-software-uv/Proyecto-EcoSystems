const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role'],
}));

const PORT = process.env.PORT || 8002;

if (!process.env.DB_PASSWORD) {
    console.error('FATAL: DB_PASSWORD environment variable is required');
    process.exit(1);
}

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ecosystems_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432')
};
const pool = new Pool(DB_CONFIG);

// Helper para registrar errores en la base de datos (US-06)
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

// Escenario 2: Monitoreo de desconexión de hardware (Simulación)
async function monitorearConectividad() {
    try {
        // Buscamos nodos que no han enviado datos en los últimos 10 minutos
        const query = `
            SELECT ns.id_nodo 
            FROM nodo_sensor ns
            LEFT JOIN (
                SELECT id_nodo, MAX(fecha_hora) as ultima_lectura
                FROM medicion_historica
                GROUP BY id_nodo
            ) h ON ns.id_nodo = h.id_nodo
            WHERE h.ultima_lectura < NOW() - INTERVAL '10 minutes'
               OR h.ultima_lectura IS NULL
        `;
        const { rows } = await pool.query(query);
        
        for (const row of rows) {
            await logSystemError('HARDWARE', 'Pérdida de conectividad detectada', 'El nodo no ha enviado datos en los últimos 10 minutos', row.id_nodo);
        }
    } catch (e) {
        console.error("Error en monitoreo de conectividad:", e.message);
    }
}
// Ejecutar monitoreo cada 5 minutos
setInterval(monitorearConectividad, 5 * 60 * 1000);

/**
 * US-06: Panel de registro y monitoreo de errores (Logs)
 * Endpoint: GET /api/v1/system-errors
 */
app.get('/api/v1/system-errors', async (req, res) => {
    // Escenario 3: Validación de Rol (Mock)
    const userRole = req.headers['x-user-role'];
    
    if (userRole !== 'Administrador') {
        return res.status(403).json({ 
            error: "FORBIDDEN", 
            message: "Acceso denegado. Se requieren permisos de Administrador." 
        });
    }

    try {
        const query = `
            SELECT id_error, tipo_error, mensaje_error, detalle_tecnico, nodo_id, fecha_hora
            FROM registro_error_sistema
            ORDER BY fecha_hora DESC
        `;
        const { rows } = await pool.query(query);
        
        // Sanitización: En este caso no hay campos sensibles como tokens en la tabla,
        // pero aseguramos que solo enviamos los campos definidos.
        res.json(rows);
    } catch (e) {
        await logSystemError('BASE_DATOS', 'Error al consultar logs de sistema', e.stack);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Error al recuperar los logs." });
    }
});

/**
 * US-08: Dashboard de gráficos históricos e interactivos
 * Endpoint: GET /api/v1/analytics
 */
app.get('/api/v1/analytics', async (req, res) => {
    const { nodeId, from, to, granularity = 'hour' } = req.query;

    // Escenario 2: Validación de parámetros y límites temporales
    if (!nodeId || !from || !to) {
        return res.status(400).json({ error: "Faltan parámetros obligatorios: nodeId, from, to." });
    }

    const dateFrom = new Date(from);
    const dateTo = new Date(to);

    if (isNaN(dateFrom) || isNaN(dateTo)) {
        return res.status(400).json({ error: "Formato de fecha inválido." });
    }

    if (dateFrom > dateTo) {
        return res.status(400).json({ error: "La fecha de inicio (from) no puede ser posterior a la de fin (to)." });
    }

    // Validar granulidad permitida
    const validGranularities = ['minute', 'hour', 'day', 'week', 'month'];
    if (!validGranularities.includes(granularity)) {
        return res.status(400).json({ error: "Granularidad no válida. Use: hour, day, etc." });
    }

    try {
        // 1. Consulta de Humedad Agregada
        const humidityQuery = `
            SELECT 
                DATE_TRUNC($1, fecha_hora) as time,
                AVG(humedad_suelo_prc) as value
            FROM medicion_historica
            WHERE id_nodo = $2 AND fecha_hora BETWEEN $3 AND $4
            GROUP BY time
            ORDER BY time ASC
        `;
        const humidityRes = await pool.query(humidityQuery, [granularity, nodeId, from, to]);

        // 2. Consulta de Eventos de Riego (Correlación por Válvula asociada al Nodo)
        const irrigationQuery = `
            SELECT 
                rv.fecha_hora as time,
                rv.accion,
                rv.motivo
            FROM registro_valvula rv
            JOIN valvula_control vc ON rv.id_valvula = vc.id_valvula
            WHERE vc.id_nodo = $1 AND rv.fecha_hora BETWEEN $2 AND $3
            ORDER BY rv.fecha_hora ASC
        `;
        const irrigationRes = await pool.query(irrigationQuery, [nodeId, from, to]);

        // Escenario 1 y 3: Respuesta exitosa (con datos o arreglos vacíos)
        res.json({
            nodeId,
            period: { from, to, granularity },
            humidity: humidityRes.rows,
            irrigationEvents: irrigationRes.rows
        });

    } catch (e) {
        await logSystemError('CODIGO', 'Error en consulta de analíticas US-08', e.stack, nodeId);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Error al consultar analíticas." });
    }
});

// Tarifa predefinida: 1.5 CLP por litro (Aproximadamente 1500 CLP por m3)
const TARIFA_CLP_POR_LITRO = 1.5;

app.get('/api/reports/monthly', async (req, res) => {
    const { month, year } = req.query;

    // Validación de parámetros (Escenario 3)
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (!month || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ error: "El campo mes debe ser un valor numérico entre 1 y 12" });
    }

    if (!year || isNaN(yearNum) || year.length !== 4) {
        return res.status(400).json({ error: "El campo año debe ser un valor numérico de 4 dígitos" });
    }

    try {
        const query = `
            SELECT 
                SUM(flujo_agua_lpm) as volumen_total_litros
            FROM medicion_historica
            WHERE EXTRACT(MONTH FROM fecha_hora) = $1 
              AND EXTRACT(YEAR FROM fecha_hora) = $2
        `;
        
        const { rows } = await pool.query(query, [monthNum, yearNum]);
        const volumen = parseFloat(rows[0].volumen_total_litros);

        // Escenario 2: Período sin datos
        if (!volumen || volumen === 0) {
            return res.json({ 
                periodo: `${month.padStart(2, '0')}-${year}`,
                message: "no existen datos disponibles para el período solicitado",
                data: [] 
            });
        }

        // Escenario 1: Cálculo exitoso
        const costoEstimado = volumen * TARIFA_CLP_POR_LITRO;

        res.json({
            periodo: `${month.padStart(2, '0')}-${year}`,
            volumen_total_litros: volumen,
            costo_estimado_clp: Math.round(costoEstimado),
            fecha_generacion: new Date().toISOString()
        });

    } catch (e) {
        await logSystemError('CODIGO', 'Error en generación de reporte mensual', e.stack);
        res.status(500).json({ detail: "Error interno del servidor" });
    }
});

app.get('/api/sensores/:id_nodo/historico', async (req, res) => {
    const { id_nodo } = req.params;
    const dias = Math.min(Math.max(parseInt(req.query.dias) || 7, 1), 90);
    
    try {
        const query = `
            SELECT fecha_hora, humedad_suelo_prc, temperatura_c, flujo_agua_lpm
            FROM medicion_historica
            WHERE id_nodo = $1 AND fecha_hora >= NOW() - INTERVAL '1 day' * $2
            ORDER BY fecha_hora ASC
        `;
        const { rows } = await pool.query(query, [id_nodo, dias]);
        res.json(rows);
    } catch (e) {
        await logSystemError('CODIGO', 'Error en consulta de históricos por nodo', e.stack, id_nodo);
        res.status(500).json({ detail: "Error interno del servidor" });
    }
});

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
    } catch (e) {
        await logSystemError('CODIGO', 'Error en consulta de estadísticas generales', e.stack);
        res.status(500).json({ detail: "Error interno del servidor" });
    }
});

// Debug endpoint: only available in development
if (process.env.NODE_ENV === 'development') {
    app.get('/api/debug/error', (req, res) => {
        throw new Error("Fallo de prueba US-06: Excepción provocada");
    });
}

// Cache en memoria para la última predicción válida (Escenario 2)
const climateCache = {};

// Simulación de API externa de clima
async function fetchClimateData(sectorId, simulateFailure = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (simulateFailure) {
                reject(new Error("Timeout o 500 desde API Climática externa"));
            } else {
                resolve({
                    recommendation: "POSTPONE",
                    waterAdjustmentPercent: -100,
                    reason: "90% probabilidad de lluvia inminente"
                });
            }
        }, 500); // simulamos latencia de red
    });
}

/**
 * US-09: Recomendaciones automáticas de riego
 * Endpoint: GET /api/v1/recommendations
 */
app.get('/api/v1/recommendations', async (req, res) => {
    const { sectorId, simulateFailure } = req.query;

    if (!sectorId) {
        return res.status(400).json({ error: "El parámetro sectorId es obligatorio." });
    }

    try {
        // Escenario 3: Validación por sector no registrado
        const checkRes = await pool.query("SELECT id_nodo FROM nodo_sensor WHERE id_nodo = $1", [sectorId]);
        if (checkRes.rowCount === 0) {
            return res.status(404).json({ error: "Sector (nodo) no registrado." });
        }

        let recommendationData;
        let isDegraded = false;

        try {
            // Escenario 1: Consulta a API externa
            recommendationData = await fetchClimateData(sectorId, simulateFailure === 'true');
            // Actualizar caché
            climateCache[sectorId] = recommendationData;
        } catch (apiError) {
            // Escenario 2: Modo Degradado
            await logSystemError('CONEXION', 'Fallo al consultar API Climática Externa', apiError.message, sectorId);
            
            if (climateCache[sectorId]) {
                recommendationData = climateCache[sectorId];
                isDegraded = true;
            } else {
                // Si no hay caché, usamos un default seguro
                recommendationData = {
                    recommendation: "MAINTAIN",
                    waterAdjustmentPercent: 0,
                    reason: "Sin datos climáticos disponibles. Mantener riego normal."
                };
                isDegraded = true;
            }
        }

        const responsePayload = {
            recommendation: recommendationData.recommendation,
            waterAdjustmentPercent: recommendationData.waterAdjustmentPercent,
            reason: recommendationData.reason
        };

        if (isDegraded) {
            responsePayload.warning = "Operando con datos climáticos de respaldo debido a un fallo en el proveedor externo.";
        }

        res.status(200).json(responsePayload);

        // Persistir asíncronamente en BD (Fire and Forget)
        pool.query(`
            INSERT INTO recomendacion_riego (id_nodo, accion_recomendada, ajuste_agua_prc, motivo)
            VALUES ($1, $2, $3, $4)
        `, [sectorId, responsePayload.recommendation, responsePayload.waterAdjustmentPercent, responsePayload.reason])
        .catch(err => console.error("Error persistiendo recomendación de forma asíncrona:", err.message));

    } catch (e) {
        await logSystemError('CODIGO', 'Error en generación de recomendaciones', e.stack, sectorId);
        res.status(500).json({ detail: "Error interno del servidor" });
    }
});

// Escenario 1: Middleware global de captura de fallos críticos (HTTP 500)
app.use(async (err, req, res, next) => {
    console.error("Fallo crítico detectado:", err.message);
    await logSystemError('CODIGO', 'Excepción no controlada', err.stack);
    
    res.status(500).json({ 
        error: "INTERNAL_SERVER_ERROR", 
        message: "Ocurrió un error inesperado en el servidor. El equipo técnico ha sido notificado." 
    });
});

app.listen(PORT, () => console.log(`API Históricos corriendo en puerto ${PORT}`));