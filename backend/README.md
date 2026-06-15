# Módulo de Backend y Gestión de Datos

Este directorio contiene el código fuente de la plataforma central del proyecto **EcoSystems**, encargada de la recepción, validación, almacenamiento de lecturas IoT y disponibilización de los datos para la interfaz de usuario.

## 🎯 Objetivo

El objetivo principal de este módulo es centralizar la información proveniente de los sensores en terreno. Permite el almacenamiento histórico para realizar comparativas de eficiencia de riego, análisis financiero y sienta las bases de datos para el futuro entrenamiento de modelos predictivos de IA.

## 🛠️ Tecnologías Utilizadas

- **Framework API**: Express.js (Node.js) - Elegido por su alto rendimiento, naturaleza asíncrona (Event Loop) y escalabilidad nativa para soportar alta concurrencia.
- **Base de Datos**: MySQL (esquemas relacionales definidos en scripts SQL).
- **Conector**: `mysql2` (Implementando Pool de Conexiones para mitigar la saturación de conexiones concurrentes).

## 🏗️ Arquitectura y Requerimientos Críticos

Conforme a las recientes evaluaciones de escalabilidad, el backend contempla las siguientes capacidades críticas:
- **Ingesta Masiva**: Diseñado y en evolución para soportar picos de hasta **10.000 lecturas por segundo** sin pérdida de paquetes.
- **Latencia Estricta**: La toma de decisiones para el accionamiento de válvulas debe resolverse en **< 100ms**.
- **Aislamiento de Procesos**: Separación del flujo transaccional pesado (históricos asíncronos) del flujo de control en tiempo real para evitar la degradación del sistema.
- **Lecturas Optimizadas**: Soporte para la visualización de datos históricos de los últimos 7 días en menos de 2 segundos.

## 📂 Estructura del Directorio

- `/api/`: Contiene la lógica principal de la aplicación, definición de endpoints y validación de datos (ej. `main.js`).
- `/database/`: Scripts de inicialización, definición de tablas relacionales y esquemas de la base de datos (ej. `01_schema.sql`).

## 🚀 Configuración y Despliegue Rápido

1. **Base de Datos**:
   - Ejecuta el script `database/01_schema.sql` en tu gestor MySQL para generar las tablas requeridas (`nodo_sensor`, `perfil_cultivo`, `medicion_historica`, `registro_valvula`).
2. **Entorno Node.js**:
   - Inicializa el proyecto con npm:
     ```bash
     npm init -y
     ```
   - Instalar dependencias base: 
     ```bash
     npm install express mysql2 cors
     ```
3. **Configuración de Credenciales**:
   - Actualizar el pool de conexiones (host, user, password, database) dentro de `api/main.js`.
4. **Ejecución del Servidor**:
   - Levantar la API en modo desarrollo: 
     ```bash
     node api/main.js
     ```
---

**Responsable de Backend (Gestión de Datos):** Joaquin Molina  
**Equipo:** EcoSystems - UV