from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os
import aio_pika
from contextlib import asynccontextmanager

# =================================================================
# CONFIGURACIÓN DEL BROKER (RabbitMQ)
# =================================================================
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
QUEUE_NAME = "telemetry_queue"

# Variables globales para mantener la conexión activa (Requisito para 10.000 req/s)
mq_connection = None
mq_channel = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mq_connection, mq_channel
    # Conectar a RabbitMQ al iniciar la API
    mq_connection = await aio_pika.connect_robust(RABBITMQ_URL)
    mq_channel = await mq_connection.channel()
    await mq_channel.declare_queue(QUEUE_NAME, durable=True)
    yield
    # Cerrar conexión al apagar la API
    await mq_connection.close()

# Inicializamos la aplicación FastAPI
app = FastAPI(title="API EcoSystems", description="API Ingesta IoT (Desacoplada)", lifespan=lifespan)

# =================================================================
# 1. MODELOS DE DATOS (Validación del JSON entrante)
# =================================================================

class Metrics(BaseModel):
    humedad_suelo_prc: int
    temperatura_c: float
    flujo_agua_lpm: float

class PayloadSensor(BaseModel):
    sensor_id: str
    protocol: str
    timestamp: str
    metrics: Metrics

# =================================================================
# 2. ENDPOINTS (Rutas)
# =================================================================

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API Ingesta EcoSystems en línea (Modo Asíncrono)"}

@app.post("/api/mediciones")
async def recibir_medicion(payload: PayloadSensor):
    """
    Recibe el JSON desde el adaptador, lo valida y lo encola asíncronamente en RabbitMQ.
    Esto permite soportar picos de 10.000 req/s sin bloquear el Event Loop.
    """
    try:
        # Convertimos el payload validado nuevamente a string JSON (Compatible con Pydantic V1 y V2)
        mensaje = payload.json() if hasattr(payload, 'json') else payload.model_dump_json()
        
        # Publicamos el mensaje en la cola
        await mq_channel.default_exchange.publish(
            aio_pika.Message(body=mensaje.encode()),
            routing_key=QUEUE_NAME,
        )
        
        # Retornamos éxito al adaptador inmediatamente (< 10ms)
        return {"status": "success", "message": "Datos encolados correctamente para su procesamiento"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al encolar mensaje: {str(e)}")