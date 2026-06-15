import asyncio
import json
import os
import aio_pika
import asyncpg
from datetime import datetime

# =================================================================
# CONFIGURACIÓN DEL BROKER Y BASE DE DATOS
# =================================================================
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
QUEUE_NAME = "telemetry_queue"

# TODO (Para Joaquín): Actualizar con las credenciales de PostgreSQL
DB_CONFIG = {
    'user': 'postgres',
    'password': 'tu_password',
    'database': 'ecosystems_db',
    'host': os.getenv("DB_HOST", "127.0.0.1"),
    'port': 5432
}

async def main():
    """
    Función principal que levanta el pool de conexiones a la BD
    y se suscribe a la cola de RabbitMQ.
    """
    print("Iniciando Worker de Históricos...")
    
    # 1. Crear Pool de Conexiones asíncrono a PostgreSQL
    pool = await asyncpg.create_pool(**DB_CONFIG)
    print("[*] Conectado exitosamente a PostgreSQL/TimescaleDB.")

    # 2. Conectar a RabbitMQ
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    
    # Garantizar prefetch para no saturar la memoria del worker (procesa 100 a la vez)
    await channel.set_qos(prefetch_count=100)
    
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)

    # 3. Función callback para procesar cada mensaje
    async def procesar_mensaje(message: aio_pika.IncomingMessage):
        async with message.process(): # Confirma automáticamente (ACK) al salir del bloque
            try:
                # Deserializar JSON
                payload = json.loads(message.body.decode())
                
                # Extraer datos
                sensor_id = payload.get("sensor_id")
                protocol = payload.get("protocol")
                timestamp_str = payload.get("timestamp").replace("Z", "+00:00") # Adaptar ISO 8601 a Python
                fecha_hora = datetime.fromisoformat(timestamp_str)
                
                metrics = payload.get("metrics", {})
                humedad = metrics.get("humedad_suelo_prc")
                temperatura = metrics.get("temperatura_c")
                flujo = metrics.get("flujo_agua_lpm")

                # Query de Inserción
                query = """
                    INSERT INTO medicion_historica 
                    (id_nodo, protocolo, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fecha_hora)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """
                
                # Adquirir conexión del pool e insertar (muy rápido)
                async with pool.acquire() as conn:
                    await conn.execute(query, sensor_id, protocol, humedad, temperatura, flujo, fecha_hora)
                    
                print(f"[x] Guardado OK: Nodo {sensor_id} - Temp: {temperatura}°C Hum: {humedad}%")
                
            except Exception as e:
                print(f"[!] Error procesando mensaje de la cola: {e}")

    # 4. Iniciar consumo de la cola
    print(f"[*] Esperando telemetría en la cola '{QUEUE_NAME}'. Presiona CTRL+C para salir.")
    await queue.consume(procesar_mensaje)

    # Mantener el script en ejecución indefinidamente
    await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())