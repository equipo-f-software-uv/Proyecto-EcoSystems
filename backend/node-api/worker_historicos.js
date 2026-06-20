const amqplib = require('amqplib');
const { Pool } = require('pg');

// =================================================================
// CONFIGURACIÓN DEL BROKER Y BASE DE DATOS
// =================================================================
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";
const QUEUE_NAME = "historicos_queue";

const DB_CONFIG = {
    user: 'postgres',
    password: 'tu_password',
    database: 'ecosystems_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: 5432
};

const pool = new Pool(DB_CONFIG);

async function main() {
    console.log("Iniciando Worker de Históricos (Node.js)...");

    try {
        // 1. Conectar a RabbitMQ
        const conn = await amqplib.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();

        // 2. Configurar Exchange y Queue
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

        console.log(`[*] Conectado a RabbitMQ. Escuchando en la cola '${QUEUE_NAME}'`);

        // 3. Procesar mensajes
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const payload = JSON.parse(msg.content.toString());
                    
                    const sensor_id = payload.sensor_id;
                    const protocol = payload.protocol || 'Unknown';
                    const timestamp = payload.timestamp;
                    
                    // Manejar métricas que pueden venir parciales desde el nuevo endpoint
                    const { 
                        humedad_suelo_prc = 0, 
                        temperatura_c = 0, 
                        flujo_agua_lpm = 0 
                    } = payload.metrics;

                    const query = `
                        INSERT INTO medicion_historica 
                        (id_nodo, protocolo, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fecha_hora)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `;

                    await pool.query(query, [sensor_id, protocol, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, timestamp]);
                    
                    console.log(`[x] Guardado OK: Nodo ${sensor_id} - Temp: ${temperatura_c}°C Hum: ${humedad_suelo_prc}%`);
                    channel.ack(msg);
                } catch (err) {
                    console.error("[!] Error procesando mensaje:", err.message);
                    // Podríamos hacer un nack aquí si el error es temporal
                    channel.nack(msg, false, false); 
                }
            }
        });

    } catch (error) {
        console.error("Error fatal en el Worker:", error);
        process.exit(1);
    }
}

main();
