const express = require('express');
const amqplib = require('amqplib');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";

let mqChannel;

async function initRabbitMQ() {
    try {
        const conn = await amqplib.connect(RABBITMQ_URL);
        mqChannel = await conn.createChannel();
        // Usamos un exchange de tipo fanout para que todos los interesados reciban el mensaje
        await mqChannel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        console.log("[*] Conectado a RabbitMQ en Ingesta. Exchange listo.");
    } catch (error) {
        console.error("Error en RabbitMQ:", error);
    }
}

app.get('/', (req, res) => {
    res.json({ status: "ok", message: "API Ingesta EcoSystems en línea (Modo Asíncrono Node.js)" });
});

/**
 * US-02: Registro histórico de mediciones de sensores.
 * Endpoint: POST /api/v1/readings
 */
app.post('/api/v1/readings', async (req, res) => {
    const { nodeId, sensorType, value } = req.body;

    // Escenario 3: Rechazo por campos faltantes
    if (nodeId === undefined || sensorType === undefined || value === undefined) {
        console.error(`[AUDIT] Error de validación: Campos faltantes en payload. Body: ${JSON.stringify(req.body)}`);
        return res.status(400).json({ 
            error: "Campos obligatorios faltantes: nodeId, sensorType, value son requeridos." 
        });
    }

    // Escenario 2: Validación por valores anómalos
    // Humedad (suponiendo que sensorType puede ser 'humedad')
    if (sensorType === 'humedad' && (value < 0 || value > 100)) {
        console.error(`[AUDIT] Valor anómalo detectado: Humedad ${value}% fuera de rango para el nodo ${nodeId}`);
        return res.status(400).json({ 
            error: "Valor de humedad inválido. Debe estar entre 0 y 100." 
        });
    }

    // Temperatura (rango físico razonable ej: -50 a 100)
    if (sensorType === 'temperatura' && (value < -50 || value > 100)) {
        console.error(`[AUDIT] Valor anómalo detectado: Temperatura ${value}°C fuera de rango para el nodo ${nodeId}`);
        return res.status(400).json({ 
            error: "Valor de temperatura fuera de rango físico real (-50 a 100)." 
        });
    }

    try {
        if (mqChannel) {
            const payload = {
                sensor_id: nodeId,
                protocol: 'v1-api',
                timestamp: new Date().toISOString(), // Inyectar timestamp del servidor (Escenario 1)
                metrics: {
                    [sensorType === 'humedad' ? 'humedad_suelo_prc' : 
                     sensorType === 'temperatura' ? 'temperatura_c' : 
                     sensorType === 'flujo' ? 'flujo_agua_lpm' : sensorType]: value
                },
                source: 'v1_endpoint'
            };

            mqChannel.publish(EXCHANGE_NAME, '', Buffer.from(JSON.stringify(payload)));
            
            console.log(`[AUDIT] Registro exitoso: Nodo ${nodeId}, Tipo ${sensorType}, Valor ${value}`);
            
            // Escenario 1: Registro exitoso (201 Created)
            return res.status(201).json({ 
                status: "success", 
                message: "Lectura registrada correctamente",
                id_generado: Date.now() // Simulando un ID generado para el reporte de éxito
            });
        } else {
            console.error("[AUDIT] Error: Servicio de colas no disponible al intentar registrar lectura.");
            return res.status(503).json({ error: "Servicio de colas no disponible" });
        }
    } catch (e) {
        console.error(`[AUDIT] Error interno al procesar lectura: ${e.message}`);
        return res.status(500).json({ error: `Error interno: ${e.message}` });
    }
});

app.post('/api/mediciones', async (req, res) => {
    try {
        const payload = req.body;
        // Validación básica
        if (!payload || !payload.sensor_id || !payload.metrics) {
            return res.status(400).json({ detail: "Faltan datos en el payload" });
        }

        if (mqChannel) {
            // Publicamos al exchange en lugar de directamente a una cola
            mqChannel.publish(EXCHANGE_NAME, '', Buffer.from(JSON.stringify(payload)));
            return res.json({ status: "success", message: "Datos publicados en el exchange correctamente" });
        } else {
            return res.status(503).json({ detail: "Servicio de colas no disponible" });
        }
    } catch (e) {
        return res.status(500).json({ detail: `Error al publicar mensaje: ${e.message}` });
    }
});

app.listen(PORT, async () => {
    await initRabbitMQ();
    console.log(`API Ingesta corriendo en puerto ${PORT}`);
});
