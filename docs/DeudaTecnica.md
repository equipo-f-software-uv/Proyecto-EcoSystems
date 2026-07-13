# Gestión de Deuda Técnica y Code Smells - EcoSystems

Este documento contiene un análisis riguroso de la **Deuda Técnica** acumulada en el proyecto **EcoSystems** al final de la Entrega 3. Su propósito es identificar malas prácticas de programación (*code smells*), evaluar sus impactos de estabilidad o rendimiento y estructurar una propuesta técnica (plan de remediación) para su resolución en el corto y mediano plazo.

---

## 1. Identificación de Code Smells (Malos Olores de Código)

A continuación, se detallan los 5 *code smells* críticos detectados en el backend del repositorio:

### 🚨 Smell 1: Configuración Física Acoplada (Hardcoded OS Fallback)
*   **Ubicación**: [api/controlador_valvulas.js#L17](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js#L17)
*   **Código con Problemas**:
    ```javascript
    const SERIAL_PORT = process.env.SERIAL_PORT || "COM3"; // Ajustar al puerto donde conectes el Arduino
    ```
*   **Descripción**: Se asume por defecto el puerto serial `"COM3"`, el cual corresponde exclusivamente al esquema de nombres de dispositivos de **Windows**. Dado que el entorno de producción corre bajo contenedores **Docker (Linux)**, este valor por defecto provocará fallas críticas de conexión serial si no se inyecta la variable de entorno correspondiente, obligando a realizar parches manuales en caliente.
*   **Gravedad**: **Alta** (Afecta la portabilidad y causa caídas en el arranque bajo Linux/Docker).

### 🚨 Smell 2: Violación del Principio DRY - Duplicación de Configuración y Pools de BD
*   **Ubicación**: 
    *   [api/controlador_valvulas.js#L20-L27](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js#L20-L27)
    *   [api/api_perfiles.js#L12-L19](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/api_perfiles.js#L12-L19)
    *   [api/api_historicos.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/api_historicos.js) (Configuración del Pool de PostgreSQL redundante)
*   **Código con Problemas**:
    ```javascript
    const DB_CONFIG = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'tu_password',
        database: process.env.DB_NAME || 'ecosystems_db',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432')
    };
    const pool = new Pool(DB_CONFIG);
    ```
*   **Descripción**: Cada microservicio define su propio bloque `DB_CONFIG` e instancia un `Pool` de base de datos de manera independiente. Si el día de mañana se requiere agregar soporte para SSL, cambiar el tamaño del pool de conexiones o implementar reintentos automáticos, se debe modificar el mismo código en 4 archivos distintos. Además, se generan demasiadas conexiones simultáneas e innecesarias hacia PostgreSQL desde el host, pudiendo agotar los sockets de red del motor de base de datos.
*   **Gravedad**: **Media** (Afecta severamente la mantenibilidad del código).

### 🚨 Smell 3: Uso de Consultas SQL Directas en Controladores (Raw SQL)
*   **Ubicación**: Distribuido a lo largo del backend, por ejemplo:
    *   [api/api_perfiles.js#L59-L72](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/api_perfiles.js#L59-L72)
    *   [api/controlador_valvulas.js#L56-L60](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js#L56-L60)
*   **Descripción**: La lógica de negocio está fuertemente acoplada con sentencias SQL crudas escritas dentro de las funciones de Express. Aunque se usan consultas parametrizadas (lo cual previene inyecciones SQL), escribir queries directas como strings dificulta la legibilidad, complica la refactorización de tablas de base de datos y no aprovecha los beneficios de las herramientas modernas de tipado y mapeo de datos.
*   **Gravedad**: **Media** (Aumenta el esfuerzo de refactorización y testabilidad).

### 🚨 Smell 4: Deuda de Pruebas Automatizadas (Testing Debt)
*   **Ubicación**: Carpeta `docs/` y estructura del proyecto.
*   **Descripción**: El aseguramiento de calidad del repositorio depende exclusivamente de pruebas manuales especificadas en formato Markdown o archivos JSON que requieren ejecución humana secuencial a través de herramientas de API. No existen archivos de pruebas unitarias (`*.test.js`) ni de integración automatizados dentro del flujo de desarrollo del backend.
*   **Gravedad**: **Alta** (Riesgo inminente de regresiones al realizar cambios rápidos de código o de base de datos).

### 🚨 Smell 5: Falta de Validación de Datos Centralizada
*   **Ubicación**: [api/api_ingesta.js#L38-L61](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/api_ingesta.js#L38-L61)
*   **Descripción**: La validación de los datos de telemetría entrantes se realiza mediante múltiples condicionales anidados `if` escritos directamente en los controladores del router de Express. No se cuenta con una capa o middleware de validación especializado ni con un esquema declarativo (ej: usando librerías como Joi o Zod). Esto propensa código espagueti a medida que se agreguen nuevos tipos de sensores.
*   **Gravedad**: **Media** (Mantenibilidad).

---

## 2. Clasificación de la Deuda Técnica del Proyecto

Podemos clasificar la deuda técnica actual bajo el cuadrante clásico de Fowler:

```
                  Temeraria                      Prudente
          +---------------------------+---------------------------+
          | [ ] Temeraria y Deliberada| [x] Prudente y Deliberada |
          | "No hay tiempo para DRY"  | "Dockerizemos el sistema  |
          |                           | pero dejemos las pruebas  |
          |                           | automáticas para después" |
Deliberada+---------------------------+---------------------------+
          | [ ] Temeraria e Inadvertida| [ ] Prudente e Inadvertida |
          | "Desconocemos qué es una  | "Ahora sabemos que el NAT |
          | hypertable o RabbitMQ"    | de Docker satura sockets" |
          +---------------------------+---------------------------+
Inadvertida
```

*   **Clasificación**: **Prudente y Deliberada**.
*   **Justificación**: El equipo optó de manera consciente por implementar una arquitectura orientada a microservicios altamente escalable con colas y TimescaleDB para asegurar que la demo del examen no perdiera datos. No obstante, para llegar a la entrega final a tiempo, se postergó la abstracción de base de datos (DRY), la suite de tests automáticos unitarios y las validaciones por esquemas.

---

## 3. Propuesta de Refactorización (Plan de Remediación)

Para resolver la deuda técnica acumulada de cara a un despliegue de grado de producción, se propone la siguiente ruta de mejora estructurada en 3 etapas prioritarias:

### Etapa 1: Limpieza de Código y Modularidad (Corto Plazo)
1.  **Centralizar la Base de Datos**: Crear un archivo `api/utils/db.js` que implemente un singleton para el pool de base de datos de PostgreSQL, abstrayendo la lectura de `.env` y controlando el número máximo de conexiones abiertas de forma global:
    ```javascript
    // db.js (Propuesta de Refactor)
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@db:5432/ecosystems_db',
        max: 20, // Límite de conexiones del pool compartido
        idleTimeoutMillis: 30000
    });
    module.exports = { query: (text, params) => pool.query(text, params) };
    ```
2.  **Parametrización Absoluta de Puertos**: Modificar [controlador_valvulas.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js) para que en entornos Linux/Docker por defecto no intente abrir puertos seriales `COM` a menos que sea provisto explícitamente por variable de entorno, forzando por defecto el simulador en contenedores.

### Etapa 2: Implementación de Calidad de Código (Mediano Plazo)
1.  **Introducción de un Query Builder (Knex.js)**: Reemplazar las sentencias SQL crudas de CRUD por consultas estructuradas en JavaScript utilizando Knex:
    ```javascript
    // Ejemplo de refactor para api_perfiles.js
    const perfiles = await db('perfil_cultivo').select('*').orderBy('id_perfil', 'asc');
    ```
2.  **Middleware de Validación de Esquemas (Zod)**: Utilizar la librería **Zod** para declarar el esquema de las telemetrías y validar de forma automatizada las peticiones HTTP entrantes, abstrayendo los `if` del controlador:
    ```javascript
    const LecturaSchema = z.object({
        nodeId: z.string().min(1),
        sensorType: z.enum(['humedad', 'temperatura', 'flujo']),
        value: z.number().min(-50).max(100)
    });
    ```

### Etapa 3: Aseguramiento de la Calidad (Automatización)
1.  ** Suite de Tests Unitarios e Integración con Jest y Supertest**: Implementar pruebas automatizadas sobre las APIs de perfiles e ingesta de datos para validar de forma automática los códigos de estado `201`, `400` y `409` bajo variaciones en el payload sin necesidad de hacer pruebas manuales repetitivas en cada despliegue.
2.  **Integración Continua (CI/CD)**: Incorporar GitHub Actions para levantar automáticamente la base de datos de pruebas e inyectar el suite de tests automáticos en cada rama de características antes de integrarla a la rama `main`.
