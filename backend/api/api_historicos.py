from fastapi import FastAPI, HTTPException, Query
import asyncpg
from contextlib import asynccontextmanager
import os
from pydantic import BaseModel
from typing import List
from datetime import datetime

# =================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# =================================================================
# TODO: Actualizar con las credenciales de PostgreSQL
DB_CONFIG = {
    'user': 'postgres',
    'password': 'tu_password',
    'database': 'ecosystems_db',
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': 5432
}

pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    print("Iniciando API de Históricos y Reportes...")
    pool = await asyncpg.create_pool(**DB_CONFIG)
    yield
    if pool:
        await pool.close()

app = FastAPI(
    title="API Históricos EcoSystems", 
    description="Microservicio de lectura optimizada para Frontend (CQRS - US-13)",
    lifespan=lifespan
)

# =================================================================
# MODELOS Y ENDPOINTS REST
# =================================================================

class Medicion(BaseModel):
    fecha_hora: datetime
    humedad_suelo_prc: float
    temperatura_c: float
    flujo_agua_lpm: float

@app.get("/api/sensores/{id_nodo}/historico", response_model=List[Medicion])
async def obtener_historico_sensor(id_nodo: str, dias: int = Query(7, ge=1, le=30)):
    """ Endpoint optimizado para gráficos de UI. Por defecto trae los últimos 7 días. """
    if not pool:
        raise HTTPException(status_code=503, detail="Conexión a Base de Datos no disponible")
        
    query = """
        SELECT fecha_hora, humedad_suelo_prc, temperatura_c, flujo_agua_lpm
        FROM medicion_historica
        WHERE id_nodo = $1 AND fecha_hora >= NOW() - INTERVAL '1 day' * $2
        ORDER BY fecha_hora ASC
    """
    try:
        async with pool.acquire() as conn:
            registros = await conn.fetch(query, id_nodo, dias)
            
        return [dict(r) for r in registros]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))