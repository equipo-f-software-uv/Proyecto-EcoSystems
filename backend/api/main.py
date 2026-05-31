from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import mysql.connector
from datetime import datetime

# Inicializamos la aplicación FastAPI
app = FastAPI(title="API EcoSystems", description="API para recolección de datos IoT")

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
# 2. CONFIGURACIÓN DE BASE DE DATOS
# =================================================================
# TODO (Para Joaquín): Cambiar estas credenciales por las de tu servidor MySQL local o en la nube.
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'tu_password',
    'database': 'ecosystems_db'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error conectando a la BD: {e}")
        return None

# =================================================================
# 3. ENDPOINTS (Rutas)
# =================================================================

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API de EcoSystems en línea"}

@app.post("/api/mediciones")
def recibir_medicion(payload: PayloadSensor):
    """
    Recibe el JSON desde el Arduino, lo valida y lo inserta en MySQL.
    """
    conn = get_db_connection()
    if not conn:
        # Si no hay BD, igual respondemos para que el hardware sepa qué pasó
        raise HTTPException(status_code=500, detail="Error de conexión a la Base de Datos")
    
    try:
        cursor = conn.cursor()
        
        # Consulta SQL preparada para evitar inyecciones SQL
        query = """
            INSERT INTO medicion_historica 
            (id_nodo, protocolo, humedad_suelo_prc, temperatura_c, flujo_agua_lpm, fecha_hora) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        # Extraemos los datos validados del payload
        valores = (
            payload.sensor_id,
            payload.protocol,
            payload.metrics.humedad_suelo_prc,
            payload.metrics.temperatura_c,
            payload.metrics.flujo_agua_lpm,
            payload.timestamp.replace("T", " ").replace("Z", "") # Parseo simple de ISO 8601 a DATETIME MySQL
        )
        
        # Ejecutamos y guardamos (commit)
        cursor.execute(query, valores)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Retornamos éxito al Arduino
        return {"status": "success", "message": "Datos guardados correctamente"}
        
    except Exception as e:
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Error al insertar en BD: {str(e)}")