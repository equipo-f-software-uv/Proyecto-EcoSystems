const mqtt = require('mqtt');
const amqplib = require('amqplib');

// =================================================================
// CONFIGURACIÓN DE BROKERS
// =================================================================
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost";
const MQTT_TOPIC = "ecosystems/telemetria/#";

async function main() {
    console.log("Iniciando Adaptador MQTT -> RabbitMQ (Node.js)...");

    try {
        // 1. Conectar a RabbitMQ
        const rabbitConn = await amqplib.connect(RABBITMQ_URL);
        const rabbitChannel = await rabbitConn.createChannel();
        await rabbitChannel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

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
                rabbitChannel.publish(EXCHANGE_NAME, '', Buffer.from(JSON.stringify(data)));
                
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
