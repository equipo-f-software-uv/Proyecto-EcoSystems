const express = require('express');
const amqplib = require('amqplib');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "telemetry_queue";

let mqChannel;

async function initRabbitMQ() {
    try {
        const conn = await amqplib.connect(RABBITMQ_URL);
        mqChannel = await conn.createChannel();
        await mqChannel.assertQueue(QUEUE_NAME, { durable: true });
        console.log("[*] Conectado a RabbitMQ en Ingesta");
    } catch (error) {
        console.error("Error en RabbitMQ:", error);
    }
}

app.get('/', (req, res) => {
    res.json({ status: "ok", message: "API Ingesta EcoSystems en línea (Modo Asíncrono Node.js)" });
});

app.post('/api/mediciones', async (req, res) => {
    try {
        const payload = req.body;
        // Validación básica
        if (!payload || !payload.sensor_id || !payload.metrics) {
            return res.status(400).json({ detail: "Faltan datos en el payload" });
        }

        if (mqChannel) {
            mqChannel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)));
            return res.json({ status: "success", message: "Datos encolados correctamente para su procesamiento" });
        } else {
            return res.status(503).json({ detail: "Servicio de colas no disponible" });
        }
    } catch (e) {
        return res.status(500).json({ detail: `Error al encolar mensaje: ${e.message}` });
    }
});

app.listen(PORT, async () => {
    await initRabbitMQ();
    console.log(`API Ingesta corriendo en puerto ${PORT}`);
});