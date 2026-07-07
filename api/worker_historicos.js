const amqplib = require('amqplib');
const { Pool } = require('pg');

// =================================================================
// CONFIGURACIÓN DEL BROKER Y BASE DE DATOS
// =================================================================
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";
const QUEUE_NAME = "historicos_queue";

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

let batch = [];
const BATCH_SIZE_LIMIT = 500;
const FLUSH_INTERVAL_MS = 100;
let flushTimer = null;
let channelRef = null;

async function flushBatch() {
    if (batch.length === 0) return;

    const currentBatch = [...batch];
    batch = [];

    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    const values = [];
    const valuePlaceholders = [];
    let counter = 1;

    for (const item of currentBatch) {
        valuePlaceholders.push(`($${counter}, $${counter+1}, $${counter+2}, $${counter+3}, $${counter+4}, $${counter+5})`);
        values.push(
            item.sensor_id,
            item.protocol,
            item.humedad_suelo_prc,
            item.temperatura_c,
            item.flujo_agua_lpm,
            item.timestamp
        );
        counter += 6;
    }

    const query = `
        INSERT INTO medicion_historica 
        (id_nodo, protocolo, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fecha_hora)
        VALUES ${valuePlaceholders.join(', ')}
    `;

    try {
        await pool.query(query, values);
        // Confirmar todos los mensajes en el lote
        for (const item of currentBatch) {
            channelRef.ack(item.originalMsg);
        }
        console.log(`[x] Lote guardado OK (${currentBatch.length} registros).`);
    } catch (err) {
        console.error("[!] Error guardando lote en BD:", err.message);
        // Reencolar los mensajes para que no se pierdan
        for (const item of currentBatch) {
            channelRef.nack(item.originalMsg, false, true);
        }
    }
}

async function connectWithRetry() {
    const maxRetries = 15;
    const retryIntervalMs = 5000;
    for (let i = 1; i <= maxRetries; i++) {
        try {
            const conn = await amqplib.connect(RABBITMQ_URL);
            console.log("[*] Conexión a RabbitMQ establecida con éxito.");
            return conn;
        } catch (err) {
            console.error(`[!] Error al conectar a RabbitMQ (Intento ${i}/${maxRetries}): ${err.message}`);
            if (i === maxRetries) throw err;
            await new Promise(res => setTimeout(res, retryIntervalMs));
        }
    }
}

async function main() {
    console.log("Iniciando Worker de Históricos Optimizado (Node.js)...");

    try {
        // 1. Conectar a RabbitMQ con reintentos
        const conn = await connectWithRetry();
        const channel = await conn.createChannel();
        channelRef = channel;

        // 2. Configurar Exchange y Queue con topic binding
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'telemetry.#');

        console.log(`[*] Conectado a RabbitMQ. Escuchando en la cola '${QUEUE_NAME}'`);

        // Prefetch alto para permitir acumular lotes rápidamente
        await channel.prefetch(1000);

        // 3. Procesar mensajes con acumulación en lote
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const payload = JSON.parse(msg.content.toString());
                    
                    const sensor_id = payload.sensor_id;
                    const protocol = payload.protocol || 'Unknown';
                    const timestamp = payload.timestamp || new Date().toISOString();
                    
                    // Manejar métricas que pueden venir parciales o nulas
                    const { 
                        humedad_suelo_prc = 0, 
                        temperatura_c = 0, 
                        flujo_agua_lpm = 0 
                    } = payload.metrics || {};

                    batch.push({
                        sensor_id,
                        protocol,
                        timestamp,
                        humedad_suelo_prc,
                        temperatura_c,
                        flujo_agua_lpm,
                        originalMsg: msg
                    });

                    if (batch.length >= BATCH_SIZE_LIMIT) {
                        await flushBatch();
                    } else if (!flushTimer) {
                        flushTimer = setTimeout(flushBatch, FLUSH_INTERVAL_MS);
                    }
                } catch (err) {
                    console.error("[!] Error decodificando o procesando mensaje individual:", err.message);
                    channel.ack(msg); // Descartar mensajes corruptos
                }
            }
        });

    } catch (error) {
        console.error("Error fatal en el Worker:", error);
        process.exit(1);
    }
}

main();
