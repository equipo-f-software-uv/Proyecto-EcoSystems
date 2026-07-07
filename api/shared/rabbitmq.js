const amqplib = require('amqplib');
const { RABBITMQ_URL, EXCHANGE_NAME } = require('./config');

async function connectWithRetry(serviceName = 'Servicio') {
    const maxRetries = 15;
    const retryIntervalMs = 5000;
    for (let i = 1; i <= maxRetries; i++) {
        try {
            const conn = await amqplib.connect(RABBITMQ_URL);
            console.log(`[*] Conexión a RabbitMQ establecida en ${serviceName}.`);
            return conn;
        } catch (err) {
            console.error(`[!] Error al conectar a RabbitMQ en ${serviceName} (Intento ${i}/${maxRetries}): ${err.message}`);
            if (i === maxRetries) throw err;
            await new Promise(res => setTimeout(res, retryIntervalMs));
        }
    }
}

function getTelemetryRoutingKey(metrics) {
    const hasHumidity = metrics && metrics.humedad_suelo_prc !== undefined;
    return hasHumidity ? 'telemetry.humidity' : 'telemetry.other';
}

module.exports = { connectWithRetry, getTelemetryRoutingKey, EXCHANGE_NAME, RABBITMQ_URL };
