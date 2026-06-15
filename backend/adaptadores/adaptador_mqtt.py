import asyncio
import json
import os
import aio_pika
import paho.mqtt.client as mqtt

# =================================================================
# CONFIGURACIÓN DE BROKERS
# =================================================================
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
QUEUE_NAME = "telemetry_queue"

# TODO: Cambiar por la IP/Dominio de tu servidor MQTT (ej. Mosquitto)
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = 1883
MQTT_TOPIC = "ecosystems/telemetria/#"

# Cola asíncrona para comunicar el hilo de MQTT con el Event Loop de RabbitMQ
message_queue = asyncio.Queue()
loop = None

# =================================================================
# CALLBACKS MQTT (Se ejecutan en un hilo en background)
# =================================================================
def on_connect(client, userdata, flags, rc):
    print(f"[*] Conectado al Broker MQTT local con código de resultado: {rc}")
    client.subscribe(MQTT_TOPIC)
    print(f"[*] Suscrito al tópico: {MQTT_TOPIC}")

def on_message(client, userdata, msg):
    """
    Se ejecuta cada vez que un sensor publica por MQTT.
    Deriva la carga útil al Event Loop asíncrono para no bloquear la recepción.
    """
    payload = msg.payload.decode('utf-8')
    if loop is not None:
        asyncio.run_coroutine_threadsafe(message_queue.put(payload), loop)

# =================================================================
# PUBLICADOR HACIA RABBITMQ (Asíncrono)
# =================================================================
async def rabbitmq_publisher():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.declare_queue(QUEUE_NAME, durable=True)
    
    print("[*] Enlace MQTT -> RabbitMQ establecido y en escucha...")
    
    while True:
        # Esperar mensajes encolados desde el hilo MQTT
        payload_str = await message_queue.get()
        try:
            data = json.loads(payload_str)
            
            # Estandarizamos el protocolo antes de inyectarlo al sistema central
            data["protocol"] = "MQTT" 
            mensaje_estandar = json.dumps(data)
            
            # Publicar en el bus central de eventos
            await channel.default_exchange.publish(
                aio_pika.Message(body=mensaje_estandar.encode()),
                routing_key=QUEUE_NAME,
            )
            print(f"[x] Puenteado a Bus Central: Nodo {data.get('sensor_id')} vía MQTT")
        except Exception as e:
            print(f"[!] Payload MQTT inválido o error de puenteo: {e}")

async def main():
    global loop
    loop = asyncio.get_running_loop()
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start() # Inicia el cliente MQTT sin bloquear
    
    await rabbitmq_publisher()

if __name__ == "__main__":
    asyncio.run(main())
