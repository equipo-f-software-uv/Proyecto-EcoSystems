# Módulo de Backend y Gestión de Datos

Este directorio contiene el código fuente de la plataforma central del proyecto **EcoSystems**, encargada de la recepción, validación, almacenamiento de lecturas IoT y disponibilización de los datos para la interfaz de usuario.

## 🎯 Objetivo

El objetivo principal de este módulo es centralizar la información proveniente de los sensores en terreno. Permite el almacenamiento histórico para realizar comparativas de eficiencia de riego, análisis financiero y sienta las bases de datos para el futuro entrenamiento de modelos predictivos de IA.

## 🛠️ Tecnologías Utilizadas

- **Framework API**: FastAPI (Python) - Elegido por su alto rendimiento, soporte asíncrono y validación robusta con Pydantic.
- **Base de Datos**: MySQL (esquemas relacionales definidos en scripts SQL).
- **Conector**: `mysql-connector-python`.

## 🏗️ Arquitectura y Requerimientos Críticos

Conforme a las recientes evaluaciones de escalabilidad, el backend contempla las siguientes capacidades críticas:
- **Ingesta Masiva**: Diseñado y en evolución para soportar picos de hasta **10.000 lecturas por segundo** sin pérdida de paquetes.
- **Latencia Estricta**: La toma de decisiones para el accionamiento de válvulas debe resolverse en **< 100ms**.
- **Aislamiento de Procesos**: Separación del flujo transaccional pesado (históricos asíncronos) del flujo de control en tiempo real para evitar la degradación del sistema.
- **Lecturas Optimizadas**: Soporte para la visualización de datos históricos de los últimos 7 días en menos de 2 segundos.

## 📂 Estructura del Directorio

- `/api/`: Contiene la lógica principal de la aplicación, definición de endpoints y modelos de validación de datos (ej. `main.py`).
- `/database/`: Scripts de inicialización, definición de tablas relacionales y esquemas de la base de datos (ej. `01_schema.sql`).

## 🚀 Configuración y Despliegue Rápido

1. **Base de Datos**:
   - Ejecuta el script `database/01_schema.sql` en tu gestor MySQL para generar las tablas requeridas (`nodo_sensor`, `perfil_cultivo`, `medicion_historica`, `registro_valvula`).
2. **Entorno Python**:
   - Se recomienda el uso de un entorno virtual (`venv`).
   - Instalar dependencias base: 
     ```bash
     pip install fastapi uvicorn pydantic mysql-connector-python
     ```
3. **Configuración de Credenciales**:
   - Actualizar el diccionario `DB_CONFIG` (host, user, password, database) dentro de `api/main.py`.
4. **Ejecución del Servidor**:
   - Levantar la API en modo desarrollo: 
     ```bash
     uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
     ```
---

**Responsable de Backend (Gestión de Datos):** Joaquin Molina  
**Equipo:** EcoSystems - UV