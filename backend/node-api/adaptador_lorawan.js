const express = require('express');
const amqplib = require('amqplib');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8004;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";

let mqChannel;

async function initRabbitMQ() {
    const maxRetries = 15;
    const retryIntervalMs = 5000;
    for (let i = 1; i <= maxRetries; i++) {
        try {
            console.log(`[*] Intentando conectar a RabbitMQ en LoRaWAN (Intento ${i}/${maxRetries})...`);
            const conn = await amqplib.connect(RABBITMQ_URL);
            mqChannel = await conn.createChannel();
            await mqChannel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
            console.log("[*] Conectado a RabbitMQ en Adaptador LoRaWAN. Exchange listo.");
            return;
        } catch (error) {
            console.error(`[!] Error en RabbitMQ (LoRaWAN) Intento ${i}/${maxRetries}:`, error.message);
            if (i === maxRetries) throw error;
            await new Promise(res => setTimeout(res, retryIntervalMs));
        }
    }
}

app.get('/', (req, res) => {
    res.json({ status: "ok", message: "Adaptador LoRaWAN EcoSystems en línea (Express)" });
});

/**
 * Webhook para recibir telemetría LoRaWAN (ej: TTN webhook, ChirpStack webhook, o simulaciones).
 * Soporta decodificación de payloads de diferentes formatos.
 */
app.post('/api/v1/lorawan/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log("[LoRaWAN Webhook] Recibido payload:", JSON.stringify(body));

        let sensor_id;
        let metrics = {};
        let timestamp = new Date().toISOString();

        // 1. Detección de formato: Formato standard de The Things Network (TTN) v3
        if (body.end_device_ids && body.uplink_message) {
            sensor_id = body.end_device_ids.device_id;
            timestamp = body.uplink_message.received_at || timestamp;

            // Si viene pre-decodificado por TTN
            if (body.uplink_message.decoded_payload) {
                metrics = body.uplink_message.decoded_payload;
            } 
            // Si viene crudo (base64)
            else if (body.uplink_message.frm_payload) {
                const buffer = Buffer.from(body.uplink_message.frm_payload, 'base64');
                const decodedStr = buffer.toString('utf-8');
                try {
                    metrics = JSON.parse(decodedStr);
                } catch (e) {
                    console.log("[LoRaWAN Webhook] No se pudo parsear frm_payload como JSON. Intentando decodificación binaria...");
                    // Si no es JSON, decodificamos como bytes personalizados (ej: byte 0 = humedad, byte 1 = temp, byte 2 = flujo)
                    if (buffer.length >= 3) {
                        metrics = {
                            humedad_suelo_prc: buffer.readUInt8(0),
                            temperatura_c: buffer.readInt8(1),
                            flujo_agua_lpm: buffer.readUInt8(2)
                        };
                    }
                }
            }
        } 
        // 2. Formato ChirpStack v4
        else if (body.deviceInfo && body.object) {
            sensor_id = body.deviceInfo.deviceName;
            metrics = body.object;
            timestamp = body.time || timestamp;
        }
        // 3. Formato simple o directo (ej: para pruebas directas)
        else if (body.sensor_id && body.metrics) {
            sensor_id = body.sensor_id;
            metrics = body.metrics;
            timestamp = body.timestamp || timestamp;
        } else {
            console.error("[LoRaWAN Webhook] Formato de payload no reconocido:", body);
            return res.status(400).json({ error: "Formato de payload LoRaWAN inválido o no soportado." });
        }

        if (!sensor_id) {
            return res.status(400).json({ error: "Falta el identificador del dispositivo (sensor_id)." });
        }

        if (mqChannel) {
            // Estandarizamos el payload interno del sistema
            const payload = {
                sensor_id: sensor_id,
                protocol: 'LoRaWAN',
                timestamp: timestamp,
                metrics: {
                    humedad_suelo_prc: metrics.humedad_suelo_prc !== undefined ? parseFloat(metrics.humedad_suelo_prc) : undefined,
                    temperatura_c: metrics.temperatura_c !== undefined ? parseFloat(metrics.temperatura_c) : undefined,
                    flujo_agua_lpm: metrics.flujo_agua_lpm !== undefined ? parseFloat(metrics.flujo_agua_lpm) : undefined
                },
                source: 'lorawan_adapter'
            };

            // Filtrar campos nulos/indefinidos
            Object.keys(payload.metrics).forEach(key => {
                if (payload.metrics[key] === undefined) delete payload.metrics[key];
            });

            // Enrutamiento inteligente a colas RabbitMQ (Exchange Topic)
            const hasHumidity = payload.metrics.humedad_suelo_prc !== undefined;
            const routingKey = hasHumidity ? 'telemetry.humidity' : 'telemetry.other';

            mqChannel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)));
            console.log(`[LoRaWAN Webhook] Puenteado con éxito a RabbitMQ (${routingKey}):`, JSON.stringify(payload));

            return res.status(201).json({
                status: "success",
                message: "Lectura de LoRaWAN procesada y enviada al bus de eventos",
                payload_procesado: payload
            });
        } else {
            return res.status(503).json({ error: "Servicio de mensajería (RabbitMQ) no disponible." });
        }

    } catch (e) {
        console.error("[LoRaWAN Webhook] Error interno:", e.message);
        return res.status(500).json({ error: `Error interno: ${e.message}` });
    }
});

app.listen(PORT, async () => {
    await initRabbitMQ();
    console.log(`Adaptador LoRaWAN corriendo en puerto ${PORT}`);
});
