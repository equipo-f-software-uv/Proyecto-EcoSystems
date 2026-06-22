# EcoSystems - Plataforma Central de Gestión Ambiental e IoT

## Descripción del sistema
EcoSystems es una solución de software y hardware orientada a la monitorización y automatización de zonas agrícolas mediante telemetría en terreno. El sistema centraliza la captura de datos ambientales de sensores IoT para optimizar recursos hídricos, analizar la eficiencia de riego, gestionar alertas operacionales y proyectar análisis financieros mediante almacenamiento especializado de series de tiempo.

---

## Historia de usuario implementada
| ID    | Nombre                                                              | Issue |
|-------|---------------------------------------------------------------------|-------|
| US-02 | Almacenamiento histórico de lecturas de sensores en la Base de Datos | #2    |
| US-09 | Panel de gráficos históricos e interactivos de humedad y riego      | #9    |

> **Nota de Alcance:** El flujo implementado cubre de extremo a extremo (Frontend, Backend y Persistencia) una transacción compleja de ingesta masiva asíncrona mediante colas RabbitMQ hacia tablas optimizadas en TimescaleDB (US-02), junto con la búsqueda y filtrado de datos históricos de los últimos 7 días renderizados en la interfaz (US-09).

---

## Historias de Usuario en Backlog (Seguimiento del Proyecto)
| IDENTIFICACIÓN | Nombre | Estado | GitHub Issue |
|----------------|--------|--------|--------------|
| **US-03** | Control automático de riego según umbrales de humedad | En Desarrollo | #3 |
| **US-04** | Gestión de perfiles de humedad por tipo de cultivo | En Desarrollo | #4 |
| **US-01** | Reporte mensual de consumo de agua para análisis de costos | Backlog | #1 |
| **US-05** | Registro de auditoría (log) para el control de válvulas | Backlog | #5 |
| **US-06** | Panel de registro y monitoreo de errores del sistema (Logs) | Backlog | #6 |
| **US-10** | Generación de recomendaciones de riego basadas en pronósticos climáticos e IA | Backlog | #10 |
| **US-11** | Control manual de riego remoto mediante aplicación móvil | Backlog | #11 |
| **US-19** | Panel de monitoreo técnico de ingesta y dispositivos | Backlog | #19 |

---

## Artefactos del proyecto
| Artefacto                          | Ubicación / enlace          | Descripción |
|------------------------------------|-----------------------------|-------------|
| **Modelo de dominio** | `[/documentos/dominio.png](./documentos/)`           | Cubre las entidades, atributos y relaciones de la HU. |
| **Diagrama de casos de uso** | `[/documentos/casos_uso.png](./documentos/)`          | Cubre la funcionalidad y actores de todas las HU del proyecto. |
| **Especificación de HU** | `./EspecificacionHU.md`     | Incluye flujos, criterios de aceptación y Definition of Done. |
| **Diagrama de estados** | `[/documentos/estados.png](./documentos/)`            | Diagrama correcto de ciclo de vida para la entidad Medición. |
| **Diagrama de despliegue y comp.** | `[/documentos/despliegue.png](./documentos/)`         | Infraestructura física y distribución de nodos presente. |
| **Diagrama de componentes** | `[/documentos/componentes.png](./documentos/)`        | Muestra explícitamente las dependencias e interfaces del sistema. |
| **Diagrama de secuencia** | `[/documentos/secuencia.png](./documentos/)`          | Secuencia detallada del flujo completo de la HU implementada. |
| **Casos de prueba** | `./CasosDePrueba.md`        | Al menos 3 casos detallados con acción y salida esperada. |
| **Deuda técnica / code smells** | `./DeudaTecnica.md`         | Registro formal de code smells, deuda técnica y propuestas de mejora. |

---

## Tecnologías Utilizadas y Caso de Uso
* **Node.js / Express.js:** Entorno de ejecución principal y API REST de backend para lógica de consultas y enrutamiento.
* **Python:** Scripts especializados para procesos en capas bajas de recolección (`api_ingesta.py`, `api_perfiles.py`).
* **PostgreSQL + TimescaleDB:** Base de datos relacional optimizada mediante hipertablas para series de tiempo de alta velocidad de ingesta IoT.
* **RabbitMQ (`amqplib`):** Broker de mensajería asíncrona encargado de desacoplar y amortiguar el tráfico entrante.
* **Next.js / TypeScript:** Aplicación del lado del cliente para visualización de métricas y gráficos reactivos.

---

## Arquitectura y Requerimientos Críticos
* **Ingesta Masiva:** Soporte estructural para picos de hasta 10.000 lecturas/segundo vía RabbitMQ sin pérdida de paquetes.
* **Latencia Estricta:** Evaluación de reglas y accionamiento de válvulas resueltos en `< 100ms`.
* **Aislamiento de Procesos:** Separación física del flujo transaccional asíncrono (background) de las llamadas síncronas de control.
* **Lecturas Optimizadas:** Consultas agregadas sobre TimescaleDB que renderizan datos históricos de 7 días en menos de 2 segundos.

---

## Estructura del Repositorio
* **`/.Géminis/`**: Documentación complementaria y configuración de endpoints de APIs.
* **`/API/`**: Código fuente de los microservicios públicos, procesos distribuidos y workers.
* **`/Arduino/`**: Firmware embebido desarrollado para el hardware del nodo sensor en terreno.
* **`/base de datos/`**: Scripts de inicialización, definición de esquemas y tablas relacionales (`01_schema.sql`).
* **`/documentos/`**: Modelos de análisis, diseño, pruebas de software y evidencias de ejecución.
* **`/Interfaz/`**: Código frontend desarrollado en Next.js con soporte completo para TypeScript.
* **`/especificación abierta/`**: Directorio técnico de diseño guiado por especificaciones (*Spec-driven development*).

---

## Puntos Finales Principales (Endpoints de la API)
| Método | Punto Final | Descripción |
|--------|-------------|-------------|
| **POST** | `/api/ingesta` | Recibe cargas de telemetría desde los nodos sensores y las publica en RabbitMQ. |
| **GET** | `/api/historicos` | Recupera métricas ambientales optimizadas de los últimos 7 días desde TimescaleDB. |
| **POST** | `/api/valvulas` | Evalúa reglas de negocio en tiempo real y comanda el hardware actuador. |
| **PUT** | `/api/perfiles/:id` | Actualiza los límites operacionales de humedad y temperatura por cultivo. |

---

## Instrucciones de instalación y ejecución

### Requisitos previos
* Node.js v18+ e instalado localmente.
* Instancia de PostgreSQL activa con la extensión oficial de TimescaleDB.
* Instancia de RabbitMQ Broker activa y accesible.

### Variables de entorno
Crea un archivo `.env` en la raíz del backend con los siguientes parámetros:
```env
DATABASE_URL=postgres://user:password@localhost:5432/ecosystems_db
RABBITMQ_URL=amqp://localhost
PORT_INGESTA=8000

# 1. Configurar la base de datos ejecutando el script en PostgreSQL
# Archivo de origen: /base de datos/01_schema.sql

# 2. Instalar dependencias en el proyecto raíz
npm install

# 3. Levantar los microservicios en terminales independientes de forma simultánea
npm run start:ingesta     # Puerto 8000
npm run start:valvulas    # Puerto 8001
npm run start:historicos  # Puerto 8002
npm run start:perfiles    # Puerto 8003

## Responsabilidades del equipo

| Integrante | Rol(es) Oficial(es) | Ítems de la rúbrica a cargo | Responsabilidades Específicas |
|------------|---------------------|-----------------------------|-------------------------------|
| **Joaquín Molina** | Technical Lead / Arquitecto (Backend y Gestión de Datos) | Ítems 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 5.1 | Arquitectura del backend, pipeline de RabbitMQ/TimescaleDB, diagramas de diseño, instrucciones de despliegue y archivo `DeudaTecnica.md`. |
| **Jorge Bahamondes** | Scrum Master / Quality Assurance | Ítems 2.1, 2.2, 2.3, 2.4, 4.1 | Gestión del backlog, diagramas de análisis (Casos de uso/Estados), matriz `CasosDePrueba.md` y archivo `EspecificacionHU.md`. |
| **Bruno Díaz** | Developer (Interfaz y Frontend) | Ítems 1.1, 1.2, 1.3 | Construcción de componentes frontend, maquetación del dashboard interactivo y consumo integrado de las APIs en Next.js. |
