import asyncio
import json
import os
import time
import aio_pika
import asyncpg
import serial
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager

# =================================================================
# CONFIGURACIÓN DEL ENTORNO
# =================================================================
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
QUEUE_NAME = "telemetry_queue"

# TODO: Ajustar al puerto donde conectes el Arduino mediante USB (ej. COM3 en Windows, /dev/ttyUSB0 en Linux)
SERIAL_PORT = "COM3" 
BAUD_RATE = 115200

DB_CONFIG = {
    'user': 'postgres',
    'password': 'tu_password',
    'database': 'ecosystems_db',
    'host': os.getenv("DB_HOST", "127.0.0.1"),
    'port': 5432
}

# Umbral crítico de humedad por defecto (Fallback)
UMBRAL_HUMEDAD_MIN_DEFAULT = 30.0

# Variables globales para compartir estado entre RabbitMQ y los endpoints de FastAPI
pool = None
mq_connection = None
arduino = None

# Cache en memoria para no saturar la BD a 10.000 req/s y mantener latencia < 100ms
cache_umbrales = {}
TIEMPO_CACHE_SEG = 60

async def procesar_telemetria(message: aio_pika.IncomingMessage):
    tiempo_inicio = time.time() # Iniciamos cronómetro de latencia
    
    async with message.process():
        payload = json.loads(message.body.decode())
        sensor_id = payload.get("sensor_id")
        humedad = payload.get("metrics", {}).get("humedad_suelo_prc")
        
        # 1. Obtener umbral dinámico consultando la BD (con caché)
        umbral_aplicar = UMBRAL_HUMEDAD_MIN_DEFAULT
        if sensor_id and pool:
            if sensor_id in cache_umbrales and (time.time() - cache_umbrales[sensor_id]['timestamp'] < TIEMPO_CACHE_SEG):
                umbral_aplicar = cache_umbrales[sensor_id]['umbral']
            else:
                async with pool.acquire() as conn:
                    umbral_db = await conn.fetchval("""
                        SELECT pc.humedad_min_prc 
                        FROM nodo_sensor ns
                        JOIN perfil_cultivo pc ON ns.id_perfil = pc.id_perfil
                        WHERE ns.id_nodo = $1
                    """, sensor_id)
                    
                    if umbral_db is not None:
                        umbral_aplicar = float(umbral_db)
                        
                    cache_umbrales[sensor_id] = {'umbral': umbral_aplicar, 'timestamp': time.time()}

        # 2. Evaluar regla de negocio con el umbral dinámico
        if humedad is not None and humedad < umbral_aplicar:
            if arduino and arduino.is_open:
                # Construir y enviar comando al Arduino
                comando = {"accion": "ABRIR", "id_valvula": "valvula_01"}
                arduino.write((json.dumps(comando) + '\n').encode('utf-8'))
                
                # Calcular latencia (US-11 CA1 y CA3)
                latencia_ms = int((time.time() - tiempo_inicio) * 1000)
                print(f"[⚡] ALERTA: Nodo {sensor_id} | Humedad {humedad}% < Umbral {umbral_aplicar}%. Válvula ABIERTA. Latencia: {latencia_ms}ms")
                
                # Registrar auditoría en base de datos de manera asíncrona
                if pool:
                    async with pool.acquire() as conn:
                        await conn.execute("""
                            INSERT INTO registro_valvula (id_valvula, accion, motivo, latencia_ms)
                            VALUES (1, 'ABRIR', 'Automático - Umbral bajo', $1)
                        """, latencia_ms)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool, mq_connection, arduino
    print("Iniciando API Controlador de Válvulas (<100ms)...")
    
    # 1. Iniciar conexión Serial con el Hardware (Arduino)
    try:
        arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        await asyncio.sleep(2) # Dar tiempo al Arduino para reiniciar el bootloader
        print(f"[*] Conexión Serial con Arduino establecida en {SERIAL_PORT}")
    except Exception as e:
        print(f"[!] Aviso: Error abriendo puerto serial (verifique cable/puerto): {e}")

    # 2. Conexiones a BD y Broker
    pool = await asyncpg.create_pool(**DB_CONFIG)
    mq_connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await mq_connection.channel()
    await channel.set_qos(prefetch_count=10) # Procesar rápido en lotes pequeños
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)

    # 3. Suscribirse a la cola (corre en background manejado por asyncio)
    print("[*] Escuchando eventos para control de riego en tiempo real...")
    await queue.consume(procesar_telemetria)
    
    yield
    
    # 4. Limpieza de recursos al apagar
    if arduino and arduino.is_open:
        arduino.close()
    if pool:
        await pool.close()
    if mq_connection:
        await mq_connection.close()

app = FastAPI(title="API Válvulas EcoSystems", description="Control de Hardware y Riego Automático", lifespan=lifespan)

# =================================================================
# MODELOS Y ENDPOINTS REST (US-11: Control Manual / Dashboard)
# =================================================================

class ComandoValvula(BaseModel):
    accion: str # "ABRIR" o "CERRAR"
    motivo: str = "Control Manual UI"

@app.post("/api/valvulas/{id_valvula}/accionar")
async def accionar_valvula(id_valvula: int, comando: ComandoValvula):
    """ Endpoint para forzar apertura/cierre desde el Dashboard """
    if not arduino or not arduino.is_open:
        raise HTTPException(status_code=503, detail="Hardware Serial no disponible")

    tiempo_inicio = time.time()
    try:
        cmd_serial = {"accion": comando.accion, "id_valvula": f"valvula_{id_valvula:02d}"}
        arduino.write((json.dumps(cmd_serial) + '\n').encode('utf-8'))
        
        latencia_ms = int((time.time() - tiempo_inicio) * 1000)
        
        # Registrar auditoría
        if pool:
            async with pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO registro_valvula (id_valvula, accion, motivo, latencia_ms)
                    VALUES ($1, $2, $3, $4)
                """, id_valvula, comando.accion, comando.motivo, latencia_ms)
                
        return {"status": "success", "accion": comando.accion, "latencia_ms": latencia_ms}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))