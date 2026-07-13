const express = require('express');
const amqplib = require('amqplib');
const { Pool } = require('pg');
const { SerialPort } = require('serialport');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 8001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";
const QUEUE_NAME = "valvulas_queue";
const SERIAL_PORT = process.env.SERIAL_PORT || "COM3"; // Ajustar al puerto donde conectes el Arduino
const BAUD_RATE = 115200;

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'tu_password',
    database: process.env.DB_NAME || 'ecosystems_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432')
};
const pool = new Pool(DB_CONFIG);

let arduino;
try {
    arduino = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE }, (err) => {
        if (err) {
            console.log(`[!] Aviso: Error abriendo puerto serial: ${err.message}`);
        }
    });
    if (arduino) {
        arduino.on('error', (err) => {
            console.log(`[!] Error asíncrono en puerto serial: ${err.message}`);
        });
        console.log(`[*] Conexión Serial con Arduino establecida en ${SERIAL_PORT}`);
    }
} catch (e) {
    console.log(`[!] Aviso: Error abriendo puerto serial: ${e.message}`);
}

const UMBRAL_MIN_DEFAULT = 30.0;
const UMBRAL_MAX_DEFAULT = 80.0;
const cache_umbrales = {};
const cache_valvulas = {};
let cached_estado_global = 'ACTIVE';
const TIEMPO_CACHE_MS = 60000;

// Helper para registro de errores centralizado (Mismo que US-06)
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

// Función auxiliar para revisar estado global (Usa la caché en memoria)
function isSystemSuspended() {
    return cached_estado_global === 'SUSPENDED';
}

async function inicializarCache() {
    try {
        console.log("Inicializando caché en memoria...");
        // 1. Cargar estado global
        const resConfig = await pool.query("SELECT estado_global FROM configuracion_sistema WHERE id_config = 1");
        if (resConfig.rows.length > 0) {
            cached_estado_global = resConfig.rows[0].estado_global;
        }

        // 2. Cargar válvulas
        const resValvulas = await pool.query("SELECT id_valvula, id_nodo, estado_actual, modo_operacion, bloqueo_manual FROM valvula_control");
        for (const row of resValvulas.rows) {
            if (row.id_nodo) {
                cache_valvulas[row.id_nodo] = {
                    id_valvula: row.id_valvula,
                    estado_actual: row.estado_actual,
                    modo_operacion: row.modo_operacion,
                    bloqueo_manual: row.bloqueo_manual
                };
            }
        }

        // 3. Cargar umbrales
        const resUmbrales = await pool.query(`
            SELECT ns.id_nodo, pc.humedad_min_prc, pc.humedad_max_prc 
            FROM nodo_sensor ns
            JOIN perfil_cultivo pc ON ns.id_perfil = pc.id_perfil
        `);
        for (const row of resUmbrales.rows) {
            cache_umbrales[row.id_nodo] = {
                min: parseFloat(row.humedad_min_prc),
                max: parseFloat(row.humedad_max_prc),
                timestamp: Date.now()
            };
        }
        console.log(`[*] Caché inicializada con éxito. Válvulas: ${Object.keys(cache_valvulas).length}, Umbrales: ${Object.keys(cache_umbrales).length}.`);
    } catch (e) {
        console.error("Error inicializando caché:", e.message);
    }
}

async function connectWithRetry() {
    const maxRetries = 15;
    const retryIntervalMs = 5000;
    for (let i = 1; i <= maxRetries; i++) {
        try {
            const conn = await amqplib.connect(RABBITMQ_URL);
            console.log("[*] Conexión a RabbitMQ establecida en Válvulas.");
            return conn;
        } catch (err) {
            console.error(`[!] Error al conectar a RabbitMQ en Válvulas (Intento ${i}/${maxRetries}): ${err.message}`);
            if (i === maxRetries) throw err;
            await new Promise(res => setTimeout(res, retryIntervalMs));
        }
    }
}

async function iniciarConsumidor() {
    try {
        const conn = await connectWithRetry();
        const channel = await conn.createChannel();
        
        // Configurar Exchange y Queue propia para este servicio como Topic
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'telemetry.humidity');

        await channel.prefetch(100);
        
        console.log("[*] Escuchando eventos para control de riego en tiempo real (Optimizado)...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const tiempo_inicio = Date.now();
                const payload = JSON.parse(msg.content.toString());
                const { sensor_id, metrics } = payload;
                const humedad = metrics?.humedad_suelo_prc;
                
                if (humedad !== undefined && sensor_id) {
                    let umbral_min = UMBRAL_MIN_DEFAULT;
                    let umbral_max = UMBRAL_MAX_DEFAULT;

                    // 1. Obtener umbrales de la caché (con TTL de 60s y fallback DB)
                    if (cache_umbrales[sensor_id] && (Date.now() - cache_umbrales[sensor_id].timestamp < TIEMPO_CACHE_MS)) {
                        umbral_min = cache_umbrales[sensor_id].min;
                        umbral_max = cache_umbrales[sensor_id].max;
                    } else {
                        try {
                            const res = await pool.query(`
                                SELECT pc.humedad_min_prc, pc.humedad_max_prc 
                                FROM nodo_sensor ns
                                JOIN perfil_cultivo pc ON ns.id_perfil = pc.id_perfil
                                WHERE ns.id_nodo = $1
                            `, [sensor_id]);
                            
                            if (res.rows.length > 0) {
                                umbral_min = parseFloat(res.rows[0].humedad_min_prc);
                                umbral_max = parseFloat(res.rows[0].humedad_max_prc);
                            }
                            cache_umbrales[sensor_id] = { min: umbral_min, max: umbral_max, timestamp: Date.now() };
                        } catch (err) {
                            console.error("Error consultando umbrales:", err.message);
                        }
                    }

                    // 2. Obtener válvula asociada desde caché (con fallback DB)
                    let valvula = cache_valvulas[sensor_id];
                    if (!valvula) {
                        try {
                            const resValvula = await pool.query(`
                                SELECT id_valvula, estado_actual, modo_operacion, bloqueo_manual FROM valvula_control WHERE id_nodo = $1
                            `, [sensor_id]);
                            if (resValvula.rows.length > 0) {
                                cache_valvulas[sensor_id] = {
                                    id_valvula: resValvula.rows[0].id_valvula,
                                    estado_actual: resValvula.rows[0].estado_actual,
                                    modo_operacion: resValvula.rows[0].modo_operacion,
                                    bloqueo_manual: resValvula.rows[0].bloqueo_manual
                                };
                                valvula = cache_valvulas[sensor_id];
                            }
                        } catch (err) {
                            console.error("Error consultando válvula:", err.message);
                        }
                    }

                    if (valvula) {
                        const { id_valvula, estado_actual, bloqueo_manual } = valvula;

                        // Respetar el bloqueo manual (Override)
                        if (bloqueo_manual) {
                            console.log(`[INFO] Nodo ${sensor_id}: Motor automático ignorado (bloqueo manual activo en válvula ${id_valvula}).`);
                        } else {
                            const systemSuspended = isSystemSuspended();

                            // Escenario 1: Activación del riego (Humedad baja)
                            if (humedad < umbral_min && estado_actual !== 'ABIERTA') {
                                // Escenario 3: Bloqueo transversal de aperturas
                                if (systemSuspended) {
                                    console.log(`[INFO] Nodo ${sensor_id}: Motor automático ignorado (Parada de Emergencia Global Activa).`);
                                } else {
                                    await accionarVálvula(id_valvula, 'ABRIR', 'Automático - Umbral bajo', tiempo_inicio);
                                    console.log(`[⚡] ALERTA: Nodo ${sensor_id} | Humedad ${humedad}% < Umbral Min ${umbral_min}%. Válvula ABIERTA.`);
                                }
                            } 
                            // Escenario 2: Desactivación del riego (Humedad alta)
                            else if (humedad >= umbral_max && estado_actual === 'ABIERTA') {
                                // Siempre podemos cerrar, incluso en emergencia.
                                await accionarVálvula(id_valvula, 'CERRAR', 'Automático - Umbral alto', tiempo_inicio);
                                console.log(`[💧] INFO: Nodo ${sensor_id} | Humedad ${humedad}% >= Umbral Max ${umbral_max}%. Válvula CERRADA.`);
                            }
                        }
                    }
                }
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error("Error en consumidor RabbitMQ:", error);
    }
}

async function accionarVálvula(id_valvula, accion, motivo, tiempo_inicio = Date.now(), simulateHardwareFailure = false) {
    try {
        // Escenario 3: Manejo de errores por desconexión del actuador IoT
        // Simulamos un fallo si no hay puerto serial o si el flag está activo (a menos que estemos en modo de simulación)
        const isSimulating = process.env.SIMULATE_ARDUINO === 'true';
        if ((!isSimulating && (!arduino || !arduino.isOpen)) || simulateHardwareFailure) {
            await logSystemError('HARDWARE', 'Fallo de comunicación con actuador', `No se pudo ${accion} la válvula ${id_valvula}`);
            throw new Error("HARDWARE_TIMEOUT");
        }

        // 1. Enviar comando serial (solo si el puerto está abierto)
        const comando = { accion, id_valvula: `valvula_${id_valvula.toString().padStart(2, '0')}` };
        if (arduino && arduino.isOpen) {
            arduino.write(JSON.stringify(comando) + '\n');
        } else {
            console.log(`[SIMULACION ARDUINO] Comando enviado por puerto serial ficticio: ${JSON.stringify(comando)}`);
        }

        // 2. Actualizar estado en la BD
        const estado_nuevo = accion === 'ABRIR' ? 'ABIERTA' : 'CERRADA';
        await pool.query(`
            UPDATE valvula_control SET estado_actual = $1 WHERE id_valvula = $2
        `, [estado_nuevo, id_valvula]);

        // Actualizar caché local
        const sensor_id = Object.keys(cache_valvulas).find(key => cache_valvulas[key].id_valvula === id_valvula);
        if (sensor_id) {
            cache_valvulas[sensor_id].estado_actual = estado_nuevo;
        }

        // 3. Registrar auditoría (Se cumple requerimiento de log obligatorio)
        const latencia_ms = Date.now() - tiempo_inicio;
        await pool.query(`
            INSERT INTO registro_valvula (id_valvula, accion, motivo, latencia_ms)
            VALUES ($1, $2, $3, $4)
        `, [id_valvula, accion, motivo, latencia_ms]);

        return { status: "success", accion, latencia_ms };
    } catch (err) {
        console.error(`Error accionando válvula ${id_valvula}:`, err.message);
        throw err;
    }
}

/**
 * Escenario 1: Activación explícita de la parada global
 * Endpoint: POST /api/v1/system/emergency-stop/activate
 */
app.post('/api/v1/system/emergency-stop/activate', async (req, res) => {
    const { reason, operatorId } = req.body;

    if (!reason || !operatorId) {
        return res.status(400).json({ error: "Faltan campos obligatorios: reason, operatorId." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Leer estado actual con bloqueo de fila
        const { rows } = await client.query("SELECT estado_global FROM configuracion_sistema WHERE id_config = 1 FOR UPDATE");
        
        // Escenario 2: Control de redundancia
        if (rows.length > 0 && rows[0].estado_global === 'SUSPENDED') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: "CONFLICT", message: "La parada de emergencia ya se encuentra activa." });
        }

        // Actualizar estado global
        await client.query(`
            UPDATE configuracion_sistema 
            SET estado_global = 'SUSPENDED', ultima_actualizacion = CURRENT_TIMESTAMP 
            WHERE id_config = 1
        `);
        cached_estado_global = 'SUSPENDED';

        // Forzar cierre de todas las válvulas abiertas
        const openValves = await client.query("SELECT id_valvula FROM valvula_control WHERE estado_actual = 'ABIERTA'");
        for (const v of openValves.rows) {
            await accionarVálvula(v.id_valvula, 'CERRAR', `EMERGENCIA GLOBAL: ${reason}`, Date.now());
        }

        // Registrar auditoría en panel de errores/sistema
        await client.query(`
            INSERT INTO registro_error_sistema (tipo_error, mensaje_error, detalle_tecnico) 
            VALUES ('SISTEMA', 'Parada de Emergencia ACTIVADA', $1)
        `, [`Operador: ${operatorId}, Motivo: ${reason}`]);

        await client.query('COMMIT');
        res.status(200).json({ status: "success", message: "Emergencia activada. Válvulas abiertas fueron cerradas." });
    } catch (e) {
        await client.query('ROLLBACK');
        await logSystemError('BASE_DATOS', 'Fallo al activar emergencia', e.stack);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    } finally {
        client.release();
    }
});

/**
 * Escenario 4: Desactivación segura de la alerta
 * Endpoint: POST /api/v1/system/emergency-stop/deactivate
 */
app.post('/api/v1/system/emergency-stop/deactivate', async (req, res) => {
    const { operatorId } = req.body;

    if (!operatorId) {
        return res.status(400).json({ error: "Faltan campos obligatorios: operatorId." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { rows } = await client.query("SELECT estado_global FROM configuracion_sistema WHERE id_config = 1 FOR UPDATE");
        
        // Escenario 2: Control de redundancia
        if (rows.length > 0 && rows[0].estado_global === 'ACTIVE') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: "CONFLICT", message: "El sistema ya se encuentra en operación normal." });
        }

        await client.query(`
            UPDATE configuracion_sistema 
            SET estado_global = 'ACTIVE', ultima_actualizacion = CURRENT_TIMESTAMP 
            WHERE id_config = 1
        `);
        cached_estado_global = 'ACTIVE';

        await client.query(`
            INSERT INTO registro_error_sistema (tipo_error, mensaje_error, detalle_tecnico) 
            VALUES ('SISTEMA', 'Parada de Emergencia DESACTIVADA', $1)
        `, [`Operador: ${operatorId}`]);

        await client.query('COMMIT');
        res.status(200).json({ status: "success", message: "Emergencia desactivada. Operación normal restaurada." });
    } catch (e) {
        await client.query('ROLLBACK');
        await logSystemError('BASE_DATOS', 'Fallo al desactivar emergencia', e.stack);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    } finally {
        client.release();
    }
});

/**
 * Escenario 1: Consulta del estado actual de los actuadores
 * Endpoint: GET /api/v1/valves/:id/status
 */
app.get('/api/v1/valves/:id/status', async (req, res) => {
    const id_valvula = parseInt(req.params.id);

    try {
        const { rows, rowCount } = await pool.query(`
            SELECT id_valvula, estado_actual, modo_operacion, bloqueo_manual 
            FROM valvula_control 
            WHERE id_valvula = $1
        `, [id_valvula]);

        if (rowCount === 0) return res.status(404).json({ error: "Válvula no encontrada." });

        const valve = rows[0];
        res.status(200).json({
            valveId: `VALVE-${valve.id_valvula.toString().padStart(2, '0')}`,
            status: valve.estado_actual === 'ABIERTA' ? 'OPEN' : 'CLOSED',
            mode: valve.modo_operacion,
            overrideActive: valve.bloqueo_manual
        });
    } catch (e) {
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    }
});

/**
 * Escenario 2: Ejecución de comando de control manual (Override con Prioridad)
 * Endpoint: POST /api/v1/valves/:id/override
 */
app.post('/api/v1/valves/:id/override', async (req, res) => {
    const id_valvula = parseInt(req.params.id);
    const { action, operatorId, simulateTimeout } = req.body;

    if (!action || (action !== 'ABRIR' && action !== 'CERRAR') || !operatorId) {
        return res.status(400).json({ error: "Parámetros inválidos. Se requiere action ('ABRIR' o 'CERRAR') y operatorId." });
    }

    // Iniciar transacción para asegurar consistencia
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Escenario 3: Bloqueo transversal de aperturas (Parada de Emergencia)
        if (action === 'ABRIR') {
            const { rows } = await client.query("SELECT estado_global FROM configuracion_sistema WHERE id_config = 1");
            if (rows.length > 0 && rows[0].estado_global === 'SUSPENDED') {
                await client.query('ROLLBACK');
                return res.status(403).json({ 
                    error: "FORBIDDEN", 
                    message: "No se puede abrir la válvula: El sistema se encuentra en Parada de Emergencia." 
                });
            }
        }

        // Verificar si la válvula existe
        const checkRes = await client.query("SELECT id_valvula FROM valvula_control WHERE id_valvula = $1", [id_valvula]);
        if (checkRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Válvula no encontrada." });
        }

        // 1. Congelar decisiones del motor automático en BD
        await client.query(`
            UPDATE valvula_control 
            SET modo_operacion = 'MANUAL', bloqueo_manual = TRUE
            WHERE id_valvula = $1
        `, [id_valvula]);

        const sensor_id = Object.keys(cache_valvulas).find(key => cache_valvulas[key].id_valvula === id_valvula);
        if (sensor_id) {
            cache_valvulas[sensor_id].modo_operacion = 'MANUAL';
            cache_valvulas[sensor_id].bloqueo_manual = true;
        }

        // 2. Intentar ejecutar la acción física y registrar auditoría
        const motivo = `MANUAL: Operador ${operatorId}`;
        const tiempo_inicio = Date.now();
        
        try {
            const result = await accionarVálvula(id_valvula, action, motivo, tiempo_inicio, simulateTimeout === true);
            await client.query('COMMIT');
            res.status(200).json({ status: "success", overrideActive: true, ...result });
        } catch (hardwareError) {
            await client.query('ROLLBACK');
            // Escenario 3: Abortar si hay desconexión (HTTP 504)
            if (hardwareError.message === 'HARDWARE_TIMEOUT') {
                return res.status(504).json({ error: "GATEWAY_TIMEOUT", message: "No se pudo comunicar con el actuador IoT." });
            }
            throw hardwareError;
        }

    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    } finally {
        client.release();
    }
});

/**
 * Quitar Override Manual (Endpoint de conveniencia)
 * Endpoint: POST /api/v1/valves/:id/auto
 */
app.post('/api/v1/valves/:id/auto', async (req, res) => {
    const id_valvula = parseInt(req.params.id);
    try {
        const { rowCount } = await pool.query(`
            UPDATE valvula_control 
            SET modo_operacion = 'AUTOMATIC', bloqueo_manual = FALSE
            WHERE id_valvula = $1
        `, [id_valvula]);
        
        if (rowCount === 0) return res.status(404).json({ error: "Válvula no encontrada." });

        const sensor_id = Object.keys(cache_valvulas).find(key => cache_valvulas[key].id_valvula === id_valvula);
        if (sensor_id) {
            cache_valvulas[sensor_id].modo_operacion = 'AUTOMATIC';
            cache_valvulas[sensor_id].bloqueo_manual = false;
        }

        res.status(200).json({ status: "success", message: "Válvula devuelta a control automático." });
    } catch (e) {
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    }
});

/**
 * US-05: Registro automático o manual de eventos (Audit Log)
 * Endpoint: POST /api/v1/valve-logs
 */
app.post('/api/v1/valve-logs', async (req, res) => {
    const { valveId, action, reason } = req.body;

    // Escenario 2: Validación de parámetros en el log
    if (valveId === undefined || action === undefined || reason === undefined) {
        return res.status(400).json({ error: "Faltan campos obligatorios: valveId, action, reason." });
    }

    if (action !== 'ABRIR' && action !== 'CERRAR') {
        return res.status(400).json({ error: "Acción inválida. Valores permitidos: ABRIR, CERRAR." });
    }

    try {
        // Escenario 3: Verificar existencia de la válvula
        const checkRes = await pool.query("SELECT id_valvula FROM valvula_control WHERE id_valvula = $1", [valveId]);
        if (checkRes.rowCount === 0) {
            return res.status(404).json({ error: "Válvula no encontrada." });
        }

        // Escenario 1: Registro exitoso (Inyección de timestamp del servidor)
        const query = `
            INSERT INTO registro_valvula (id_valvula, accion, motivo, fecha_hora)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING id_registro, fecha_hora
        `;
        const { rows } = await pool.query(query, [valveId, action, reason]);

        res.status(201).json({ 
            status: "success", 
            message: "Evento de auditoría registrado correctamente",
            data: rows[0]
        });
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

/**
 * US-05: Consulta del historial de auditoría
 * Endpoint: GET /api/v1/valve-logs
 */
app.get('/api/v1/valve-logs', async (req, res) => {
    const { valveId } = req.query;

    if (!valveId) {
        return res.status(400).json({ error: "El parámetro valveId es obligatorio." });
    }

    try {
        // Escenario 3: Verificar existencia y retornar logs ordenados
        const checkRes = await pool.query("SELECT id_valvula FROM valvula_control WHERE id_valvula = $1", [valveId]);
        if (checkRes.rowCount === 0) {
            return res.status(404).json({ error: "Válvula no encontrada." });
        }

        const query = `
            SELECT id_registro, id_valvula, accion, motivo, latencia_ms, fecha_hora
            FROM registro_valvula
            WHERE id_valvula = $1
            ORDER BY fecha_hora DESC
        `;
        const { rows } = await pool.query(query, [valveId]);

        res.status(200).json(rows);
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

/**
 * US-03: Registro de eventos de riego.
 * Endpoint: GET /api/irrigation/events
 */
app.get('/api/irrigation/events', async (req, res) => {
    try {
        const query = `
            SELECT rv.*, vc.nombre_valvula 
            FROM registro_valvula rv
            JOIN valvula_control vc ON rv.id_valvula = vc.id_valvula
            ORDER BY rv.fecha_hora DESC
            LIMIT 50
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

// Deprecated: Endpoit original reemplazado por /override
app.post('/api/valvulas/:id_valvula/accionar', async (req, res) => {
    const id_valvula = parseInt(req.params.id_valvula);
    const { accion, motivo = "Control Manual UI" } = req.body;

    try {
        const result = await accionarVálvula(id_valvula, accion, motivo);
        res.json(result);
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

app.listen(PORT, async () => {
    await inicializarCache();
    await iniciarConsumidor();
    console.log(`API Válvulas corriendo en puerto ${PORT}`);
});
