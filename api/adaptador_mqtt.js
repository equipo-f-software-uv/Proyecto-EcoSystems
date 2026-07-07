const mqtt = require('mqtt');
const { connectWithRetry, getTelemetryRoutingKey, EXCHANGE_NAME } = require('./shared/rabbitmq');

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost";
const MQTT_TOPIC = "ecosystems/telemetria/#";

async function main() {
    console.log("Iniciando Adaptador MQTT -> RabbitMQ (Node.js)...");

    try {
        // 1. Conectar a RabbitMQ con reintentos
        const rabbitConn = await connectWithRetry('Adaptador MQTT');
        const rabbitChannel = await rabbitConn.createChannel();
        await rabbitChannel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        console.log("[*] Conectado a RabbitMQ. Exchange preparado.");

        // 2. Conectar a MQTT
        const mqttClient = mqtt.connect(MQTT_BROKER);

        mqttClient.on('connect', () => {
            console.log(`[*] Conectado al Broker MQTT en ${MQTT_BROKER}`);
            mqttClient.subscribe(MQTT_TOPIC, (err) => {
                if (!err) {
                    console.log(`[*] Suscrito al tópico: ${MQTT_TOPIC}`);
                } else {
                    console.error("[!] Error al suscribirse:", err);
                }
            });
        });

        mqttClient.on('message', (topic, message) => {
            try {
                const payloadStr = message.toString();
                const data = JSON.parse(payloadStr);

                // Estandarizamos el protocolo
                data["protocol"] = "MQTT";
                
                // Publicar en el exchange de RabbitMQ
                rabbitChannel.publish(EXCHANGE_NAME, getTelemetryRoutingKey(data.metrics), Buffer.from(JSON.stringify(data)));
                
                console.log(`[x] Puenteado a RabbitMQ: Nodo ${data.sensor_id} vía MQTT`);
            } catch (e) {
                console.error("[!] Payload MQTT inválido o error de puenteo:", e.message);
            }
        });

        mqttClient.on('error', (err) => {
            console.error("[!] Error en cliente MQTT:", err);
        });

    } catch (error) {
        console.error("Error fatal en el Adaptador MQTT:", error);
        process.exit(1);
    }
}

main();
