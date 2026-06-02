from fastapi import FastAPI, HTTPException
import asyncpg
from contextlib import asynccontextmanager
import os
from pydantic import BaseModel
from typing import List

# =================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# =================================================================
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
    print("Iniciando API de Perfiles de Cultivo...")
    pool = await asyncpg.create_pool(**DB_CONFIG)
    yield
    if pool:
        await pool.close()

app = FastAPI(
    title="API Perfiles EcoSystems", 
    description="Microservicio CRUD para gestionar umbrales de humedad por cultivo (US-04)",
    lifespan=lifespan
)

# =================================================================
# MODELOS PYDANTIC
# =================================================================

class PerfilCultivoBase(BaseModel):
    nombre_cultivo: str
    humedad_min_prc: int
    humedad_max_prc: int

class PerfilCultivo(PerfilCultivoBase):
    id_perfil: int

# =================================================================
# ENDPOINTS REST (CRUD)
# =================================================================

@app.get("/api/perfiles", response_model=List[PerfilCultivo])
async def obtener_perfiles():
    """ Lista todos los perfiles de cultivo configurados. """
    if not pool:
        raise HTTPException(status_code=503, detail="BD no disponible")
    async with pool.acquire() as conn:
        registros = await conn.fetch("SELECT * FROM perfil_cultivo ORDER BY id_perfil ASC")
        return [dict(r) for r in registros]

@app.post("/api/perfiles", response_model=PerfilCultivo)
async def crear_perfil(perfil: PerfilCultivoBase):
    """ Crea un nuevo perfil de cultivo. """
    if not pool:
        raise HTTPException(status_code=503, detail="BD no disponible")
    
    query = """
        INSERT INTO perfil_cultivo (nombre_cultivo, humedad_min_prc, humedad_max_prc)
        VALUES ($1, $2, $3) RETURNING id_perfil
    """
    try:
        async with pool.acquire() as conn:
            id_nuevo = await conn.fetchval(query, perfil.nombre_cultivo, perfil.humedad_min_prc, perfil.humedad_max_prc)
        return {**perfil.model_dump(), "id_perfil": id_nuevo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/perfiles/{id_perfil}")
async def eliminar_perfil(id_perfil: int):
    """ Elimina un perfil de cultivo existente. """
    if not pool:
        raise HTTPException(status_code=503, detail="BD no disponible")
        
    query = "DELETE FROM perfil_cultivo WHERE id_perfil = $1 RETURNING id_perfil"
    try:
        async with pool.acquire() as conn:
            borrado = await conn.fetchval(query, id_perfil)
            if not borrado:
                raise HTTPException(status_code=404, detail="Perfil no encontrado")
        return {"status": "success", "message": f"Perfil {id_perfil} eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))